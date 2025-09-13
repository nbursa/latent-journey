package api

import (
	"net/http"
	"sync"
	"time"
)

type SSEHub struct {
	clients map[chan string]struct{}
	mu      sync.Mutex
}

func NewSSEHub() *SSEHub {
	return &SSEHub{clients: make(map[chan string]struct{})}
}

func (h *SSEHub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Cache-Control")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	ch := make(chan string, 16)

	h.mu.Lock()
	h.clients[ch] = struct{}{}
	h.mu.Unlock()
	defer func() {
		h.mu.Lock()
		delete(h.clients, ch)
		h.mu.Unlock()
		close(ch)
	}()

	// Send initial connection message
	w.Write([]byte("data: {\"type\":\"connection\",\"message\":\"connected\"}\n\n"))
	flusher.Flush()

	// Send keep-alive messages and handle client messages
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case msg := <-ch:
			w.Write([]byte("data: " + msg + "\n\n"))
			flusher.Flush()
		case <-ticker.C:
			w.Write([]byte("data: {\"type\":\"ping\"}\n\n"))
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}

func (h *SSEHub) Broadcast(msg string) {
	h.mu.Lock()
	for ch := range h.clients {
		select {
		case ch <- msg:
		default:
		}
	}
	h.mu.Unlock()
}
