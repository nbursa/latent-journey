package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
)

var hub = NewSSEHub()

func RegisterRoutes(mux *http.ServeMux) {
	mux.Handle("/events", hub)
	mux.HandleFunc("/api/vision/frame", postVisionFrame)
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

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}
