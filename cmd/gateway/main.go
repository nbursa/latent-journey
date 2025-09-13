package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"latent-journey/pkg/api"
)

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
	log.Fatal(http.ListenAndServe(":8080", mux))
}
