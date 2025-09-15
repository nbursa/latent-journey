package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"latent-journey/pkg/api"
)

// CORS middleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cache-Control")
		w.Header().Set("Access-Control-Max-Age", "86400")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	mux := http.NewServeMux()

	// Register API routes
	fmt.Println("Registering API routes...")
	api.RegisterRoutes(mux)
	fmt.Println("API routes registered")

	// Keep ping endpoint for health checks
	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"message": "I am Gateway", "service": "gateway", "status": "running"}`)
	})

	// Health check endpoint
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"status": "healthy", "service": "gateway", "timestamp": "%s"}`, time.Now().Format(time.RFC3339))
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintf(w, "I am Gateway")
	})

	fmt.Println("Gateway service starting on :8080")
	fmt.Println("I am Gateway")
	log.Fatal(http.ListenAndServe(":8080", corsMiddleware(mux)))
}
