package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"message": "I am Gateway", "service": "gateway", "status": "running"}`)
	})

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintf(w, "I am Gateway")
	})

	fmt.Println("Gateway service starting on :8080")
	fmt.Println("I am Gateway")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
