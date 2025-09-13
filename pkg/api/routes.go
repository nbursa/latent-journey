package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

var hub = NewSSEHub()

func RegisterRoutes(mux *http.ServeMux) {
	mux.Handle("/events", hub)
	mux.HandleFunc("/api/vision/frame", postVisionFrame)
	mux.HandleFunc("/api/speech/transcript", postSpeechTranscript)
	mux.HandleFunc("/api/sentience/tokenize", postSentienceTokenize)
	// add others...
}

type clipResp struct {
	TopK []struct {
		Label string  `json:"label"`
		Score float64 `json:"score"`
	} `json:"topk"`
	Embedding []float64 `json:"embedding"`
}

type frameIn struct {
	ImageBase64 string `json:"image_base64"`
}

type speechIn struct {
	AudioBase64 string `json:"audio_base64"`
}

type tokenizeIn struct {
	EmbeddingID string `json:"embedding_id"`
	ClipTopK    []struct {
		Label string  `json:"label"`
		Score float64 `json:"score"`
	} `json:"clip_topk"`
}

type sentienceTokenResp struct {
	Type        string                 `json:"type"`
	Ts          int64                  `json:"ts"`
	EmbeddingID string                 `json:"embedding_id"`
	Facets      map[string]interface{} `json:"facets"`
}

type whisperResp struct {
	Transcript string  `json:"transcript"`
	Confidence float64 `json:"confidence"`
	Language   string  `json:"language"`
}

func postVisionFrame(w http.ResponseWriter, r *http.Request) {
	// Limit request body size to 8MB
	const maxSize = 8 << 20 // 8MB
	r.Body = http.MaxBytesReader(w, r.Body, maxSize)

	var in frameIn
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.ImageBase64 == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// call ML service
	body, _ := json.Marshal(map[string]string{"image_base64": in.ImageBase64})
	resp, err := http.Post("http://localhost:8081/infer/clip", "application/json", bytes.NewReader(body))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)

	var out clipResp
	if err := json.Unmarshal(b, &out); err != nil {
		http.Error(w, "ml parse error", http.StatusBadGateway)
		return
	}

	// broadcast SSE event
	ev := map[string]any{
		"type":         "vision.observation",
		"clip_topk":    out.TopK,
		"embedding_id": "emb-1",
	}
	evBytes, _ := json.Marshal(ev)
	hub.Broadcast(string(evBytes))

	// Also call sentience run for vision
	runReq := map[string]interface{}{
		"embedding_id":  "emb-1",
		"context":       fmt.Sprintf("%s:%.2f %s:%.2f %s:%.2f", out.TopK[0].Label, out.TopK[0].Score, out.TopK[1].Label, out.TopK[1].Score, out.TopK[2].Label, out.TopK[2].Score),
		"vision_object": out.TopK[0].Label,
		"vision_color":  "yellow", // TODO: extract from CLIP or add color detection
	}
	runBody, _ := json.Marshal(runReq)
	runClient := &http.Client{Timeout: 5 * time.Second}
	runResp, err := runClient.Post("http://localhost:8082/run", "application/json", bytes.NewReader(runBody))
	if err == nil && runResp.StatusCode < 400 {
		runData, _ := io.ReadAll(runResp.Body)
		runResp.Body.Close()

		// Parse the response and broadcast as sentience.token event
		var sentienceResp map[string]interface{}
		if err := json.Unmarshal(runData, &sentienceResp); err == nil {
			hub.Broadcast(string(runData))
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}

func postSentienceTokenize(w http.ResponseWriter, r *http.Request) {
	// Limit request body size to 1MB
	const maxSize = 1 << 20 // 1MB
	r.Body = http.MaxBytesReader(w, r.Body, maxSize)

	var in tokenizeIn
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.EmbeddingID == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// call Sentience service
	body, _ := json.Marshal(in)
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Post("http://localhost:8082/tokenize", "application/json", bytes.NewReader(body))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		http.Error(w, "sentience service error", http.StatusBadGateway)
		return
	}

	b, _ := io.ReadAll(resp.Body)

	var out sentienceTokenResp
	if err := json.Unmarshal(b, &out); err != nil {
		http.Error(w, "sentience parse error", http.StatusBadGateway)
		return
	}

	// broadcast SSE event
	evBytes, _ := json.Marshal(out)
	hub.Broadcast(string(evBytes))

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}

func postSpeechTranscript(w http.ResponseWriter, r *http.Request) {
	// Limit request body size to 10MB for audio
	const maxSize = 10 << 20 // 10MB
	r.Body = http.MaxBytesReader(w, r.Body, maxSize)

	var in speechIn
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.AudioBase64 == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// call ML service for Whisper
	body, _ := json.Marshal(map[string]string{"audio_base64": in.AudioBase64})
	resp, err := http.Post("http://localhost:8081/infer/whisper", "application/json", bytes.NewReader(body))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)

	var out whisperResp
	if err := json.Unmarshal(b, &out); err != nil {
		http.Error(w, "whisper parse error", http.StatusBadGateway)
		return
	}

	// broadcast SSE event
	ev := map[string]any{
		"type":         "speech.transcript",
		"transcript":   out.Transcript,
		"confidence":   out.Confidence,
		"language":     out.Language,
		"embedding_id": "speech-1",
	}
	evBytes, _ := json.Marshal(ev)
	hub.Broadcast(string(evBytes))

	// Also call sentience run for speech
	runReq := map[string]interface{}{
		"embedding_id": "speech-1",
		"context":      "",
		"transcript":   out.Transcript,
	}
	runBody, _ := json.Marshal(runReq)
	runClient := &http.Client{Timeout: 5 * time.Second}
	runResp, err := runClient.Post("http://localhost:8082/run", "application/json", bytes.NewReader(runBody))
	if err == nil && runResp.StatusCode < 400 {
		runData, _ := io.ReadAll(runResp.Body)
		runResp.Body.Close()

		// Parse the response and broadcast as sentience.token event
		var sentienceResp map[string]interface{}
		if err := json.Unmarshal(runData, &sentienceResp); err == nil {
			hub.Broadcast(string(runData))
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}
