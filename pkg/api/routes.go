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

// Global flag to pause status monitoring during AI generation
var isAIGenerating = false

func RegisterRoutes(mux *http.ServeMux) {
	mux.Handle("/events", hub)
	mux.HandleFunc("/api/vision/frame", postVisionFrame)
	mux.HandleFunc("/api/speech/transcript", postSpeechTranscript)
	mux.HandleFunc("/api/sentience/tokenize", postSentienceTokenize)
	mux.HandleFunc("/api/llm/generate-thought", postGenerateThought)
	mux.HandleFunc("/api/llm/consciousness-metrics", getConsciousnessMetrics)
	mux.HandleFunc("/api/llm/thought-history", getThoughtHistory)
	mux.HandleFunc("/api/memory", getMemory)
	mux.HandleFunc("/sentience/memory", getMemory)

	// Ego service routes
	mux.HandleFunc("/api/ego/reflect", postEgoReflect)
	mux.HandleFunc("/api/ego/consolidate", postEgoConsolidate)
	mux.HandleFunc("/api/ego/memories", getEgoMemories)
	mux.HandleFunc("/api/ego/status", getEgoStatus)
	mux.HandleFunc("/api/ego/experiences", getEgoExperiences)
	mux.HandleFunc("/api/ego/clear-ltm", postEgoClearLTM)

	// AI generation control routes
	mux.HandleFunc("/api/ai/generation/start", postAIGenerationStart)
	mux.HandleFunc("/api/ai/generation/stop", postAIGenerationStop)

	// Embeddings service routes
	mux.HandleFunc("/api/embeddings/add", postAddEmbedding)
	mux.HandleFunc("/api/embeddings", getEmbeddings)
	mux.HandleFunc("/api/embeddings/source/", getEmbeddingsBySource)
	mux.HandleFunc("/api/embeddings/reduce-dimensions", postReduceDimensions)

	// Health check proxy routes
	mux.HandleFunc("/llm/health", getLLMHealth)
	mux.HandleFunc("/ego/health", getEgoHealth)
	mux.HandleFunc("/embeddings/ping", getEmbeddingsPing)

	// Start service status monitor
	go startServiceStatusMonitor()
	fmt.Println("Service status monitor started")
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

type thoughtRequest struct {
	RecentEvents   []map[string]interface{} `json:"recent_events"`
	EmotionalState map[string]float64       `json:"emotional_state"`
	AttentionFocus []string                 `json:"attention_focus"`
	MemoryPatterns []map[string]interface{} `json:"memory_patterns"`
}

func postVisionFrame(w http.ResponseWriter, r *http.Request) {
	const maxSize = 8 << 20 // 8MB
	r.Body = http.MaxBytesReader(w, r.Body, maxSize)

	var in frameIn
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.ImageBase64 == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	body, _ := json.Marshal(map[string]string{"image_base64": in.ImageBase64})
	resp, err := http.Post("http://localhost:8081/infer/clip", "application/json", bytes.NewReader(body))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)

	var out struct {
		TopK []struct {
			Label string  `json:"label"`
			Score float64 `json:"score"`
		} `json:"topk"`
		Embedding     []float64 `json:"embedding"`
		DominantColor string    `json:"dominant_color"`
		AffectValence float64   `json:"affect_valence"`
		AffectArousal float64   `json:"affect_arousal"`
	}
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
		"embedding_id":   "emb-1",
		"context":        fmt.Sprintf("%s:%.2f %s:%.2f %s:%.2f", out.TopK[0].Label, out.TopK[0].Score, out.TopK[1].Label, out.TopK[1].Score, out.TopK[2].Label, out.TopK[2].Score),
		"vision_object":  out.TopK[0].Label,
		"vision_color":   out.DominantColor,
		"affect_valence": out.AffectValence,
		"affect_arousal": out.AffectArousal,
		"embedding":      out.Embedding,
	}
	runBody, _ := json.Marshal(runReq)
	fmt.Printf("Calling sentience /run with: %s\n", string(runBody))
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

	// Generate text embedding for the transcript
	var textEmbedding []float64
	textBody, _ := json.Marshal(map[string]string{"text": out.Transcript})
	textResp, err := http.Post("http://localhost:8081/infer/text", "application/json", bytes.NewReader(textBody))
	if err == nil && textResp.StatusCode < 400 {
		textData, _ := io.ReadAll(textResp.Body)
		textResp.Body.Close()

		var textResult map[string]interface{}
		if err := json.Unmarshal(textData, &textResult); err == nil {
			if embedding, ok := textResult["embedding"].([]interface{}); ok {
				textEmbedding = make([]float64, len(embedding))
				for i, v := range embedding {
					if f, ok := v.(float64); ok {
						textEmbedding[i] = f
					}
				}
			}
		}
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
		"embedding":    textEmbedding, // Pass the text embedding
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

func postGenerateThought(w http.ResponseWriter, r *http.Request) {
	const maxSize = 1 << 20 // 1MB
	r.Body = http.MaxBytesReader(w, r.Body, maxSize)

	var in thoughtRequest
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// call LLM service
	body, _ := json.Marshal(in)
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Post("http://localhost:8083/generate-thought", "application/json", bytes.NewReader(body))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		http.Error(w, "llm service error", http.StatusBadGateway)
		return
	}

	b, _ := io.ReadAll(resp.Body)

	var out map[string]interface{}
	if err := json.Unmarshal(b, &out); err != nil {
		http.Error(w, "llm parse error", http.StatusBadGateway)
		return
	}

	// broadcast SSE event if thought was generated successfully
	if success, ok := out["success"].(bool); ok && success {
		if thought, ok := out["thought"].(map[string]interface{}); ok {
			ev := map[string]any{
				"type":    "ego.thought",
				"thought": thought,
			}
			evBytes, _ := json.Marshal(ev)
			hub.Broadcast(string(evBytes))
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(b)
}

func getConsciousnessMetrics(w http.ResponseWriter, r *http.Request) {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("http://localhost:8083/consciousness-metrics")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		http.Error(w, "llm service error", http.StatusBadGateway)
		return
	}

	b, _ := io.ReadAll(resp.Body)
	w.Header().Set("Content-Type", "application/json")
	w.Write(b)
}

func getThoughtHistory(w http.ResponseWriter, r *http.Request) {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("http://localhost:8083/thought-history")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		http.Error(w, "llm service error", http.StatusBadGateway)
		return
	}

	b, _ := io.ReadAll(resp.Body)
	w.Header().Set("Content-Type", "application/json")
	w.Write(b)
}

func getMemory(w http.ResponseWriter, r *http.Request) {
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	url := "http://localhost:8082/memory"
	if r.URL.RawQuery != "" {
		url = "http://localhost:8082/memory?" + r.URL.RawQuery
	}

	resp, err := client.Get(url)
	if err != nil {
		http.Error(w, "Failed to fetch memory from Sentience service", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// Ego service handlers
func postEgoReflect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Forward request to ego service
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Post("http://localhost:8084/api/ego/reflect", "application/json", r.Body)
	if err != nil {
		http.Error(w, "Failed to call ego service", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Copy response body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func postEgoConsolidate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Forward request to ego service
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Post("http://localhost:8084/api/ego/consolidate", "application/json", r.Body)
	if err != nil {
		http.Error(w, "Failed to call ego service", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Copy response body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func getEgoMemories(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Forward request to ego service
	client := &http.Client{Timeout: 10 * time.Second}
	url := "http://localhost:8084/api/ego/memories" + r.URL.RawQuery
	resp, err := client.Get(url)
	if err != nil {
		http.Error(w, "Failed to call ego service", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Copy response body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func getEgoStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Forward request to ego service
	client := &http.Client{Timeout: 10 * time.Second}
	url := "http://localhost:8084/api/ego/status"
	resp, err := client.Get(url)
	if err != nil {
		http.Error(w, "Failed to call ego service", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Copy response body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func getEgoExperiences(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Forward request to ego service
	client := &http.Client{Timeout: 10 * time.Second}
	url := "http://localhost:8084/api/ego/experiences" + r.URL.RawQuery
	resp, err := client.Get(url)
	if err != nil {
		http.Error(w, "Failed to call ego service", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Copy response body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func postEgoClearLTM(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Forward request to ego service
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post("http://localhost:8084/api/ego/clear-ltm", "application/json", r.Body)
	if err != nil {
		http.Error(w, "Failed to call ego service", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Copy response body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func postAddEmbedding(w http.ResponseWriter, r *http.Request) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post("http://localhost:8085/add", "application/json", r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Copy response body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func getEmbeddings(w http.ResponseWriter, r *http.Request) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get("http://localhost:8085/embeddings")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Copy response body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func getEmbeddingsBySource(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	source := path[len("/api/embeddings/source/"):]

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get("http://localhost:8085/embeddings/source/" + source)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Copy response body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func postReduceDimensions(w http.ResponseWriter, r *http.Request) {
	client := &http.Client{Timeout: 30 * time.Second} // Longer timeout for ML processing
	resp, err := client.Post("http://localhost:8081/reduce-dimensions", "application/json", r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Copy response body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// Health check proxy functions
func getLLMHealth(w http.ResponseWriter, r *http.Request) {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("http://localhost:8083/health")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Copy response body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func getEgoHealth(w http.ResponseWriter, r *http.Request) {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("http://localhost:8084/health")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Copy response body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func getEmbeddingsPing(w http.ResponseWriter, r *http.Request) {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("http://localhost:8085/ping")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	// Copy response body
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// Service status monitor
func startServiceStatusMonitor() {
	servicePorts := map[string]int{
		"gateway":    8080,
		"ml":         8081,
		"sentience":  8082,
		"llm":        8083,
		"ego":        8084,
		"embeddings": 8085,
	}

	client := &http.Client{Timeout: 500 * time.Millisecond} // Ultra-fast timeout

	for {
		// Skip status checking if AI is generating
		if isAIGenerating {
			fmt.Println("Skipping status check - AI is generating")
			time.Sleep(10 * time.Second) // Wait longer during generation
			continue
		}

		for service, port := range servicePorts {
			go func(serviceName string, servicePort int) {
				// Check service health
				online := checkServiceHealth(client, servicePort, serviceName)

				// Broadcast status update
				statusEvent := map[string]interface{}{
					"type":      "service.status",
					"service":   serviceName,
					"status":    map[bool]string{true: "online", false: "offline"}[online],
					"timestamp": time.Now().Unix(),
				}

				statusBytes, _ := json.Marshal(statusEvent)
				// fmt.Printf("Broadcasting status: %s = %s\n", serviceName, statusEvent["status"])
				hub.Broadcast(string(statusBytes))
			}(service, port)
		}

		// Check every 5 seconds (much less frequent than before)
		time.Sleep(5 * time.Second)
	}
}

func checkServiceHealth(client *http.Client, port int, serviceName string) bool {
	var endpoint string
	switch serviceName {
	case "llm", "ego":
		endpoint = "/health"
	default:
		endpoint = "/ping"
	}

	resp, err := client.Get(fmt.Sprintf("http://localhost:%d%s", port, endpoint))
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return false
	}

	// For health endpoints, also check the response body
	if endpoint == "/health" {
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return false
		}

		var healthResp map[string]interface{}
		if err := json.Unmarshal(body, &healthResp); err != nil {
			return false
		}

		// Check if status is "healthy" or "running"
		if status, ok := healthResp["status"].(string); ok {
			return status == "healthy" || status == "running"
		}
	}

	return true
}

// AI generation control handlers
func postAIGenerationStart(w http.ResponseWriter, r *http.Request) {
	isAIGenerating = true
	fmt.Println("AI generation started - pausing status checks")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "AI generation started"}`))
}

func postAIGenerationStop(w http.ResponseWriter, r *http.Request) {
	isAIGenerating = false
	fmt.Println("AI generation stopped - resuming status checks")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "AI generation stopped"}`))
}
