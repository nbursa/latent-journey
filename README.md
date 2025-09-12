# latent-journey

> An interactive tool for exploring the latent spaces of multimodal AI models  
> through real-time perception, introspective feedback, and symbolic memory.

This project is a submission for the **California Institute for Machine Consciousness (CIMC)**  
Research Engineer Challenge – **Challenge Option 1: Latent Journey**.

---

## What it does

- Captures user input (image, speech, text) in real-time
- Uses existing AI models (CLIP, Whisper, LLMs) to generate latent representations
- Tokenizes perceptions into symbolic structures (via `Sentience`)
- Reflects on them via a cognitive agent loop (`AI-Ego`)
- Displays everything in a 4-panel interface:
  - **Live Perception** (Webcam + STT)
  - **Latent Insight** (Embeddings, tokens, NN)
  - **Thought Stream** (LLM-based internal reflections)
  - **Memory Timeline** (STM → LTM events)

---

## Project Structure

```text
latent-journey/
├── docs/                       # 1_... 7_ (već spremno)
├── cmd/
│   └── gateway/                # Go main (HTTP + SSE)
│       └── main.go
├── pkg/
│   ├── api/                    # Go handlers, DTOs, event bus
│   ├── stm/                    # ring buffer (STM)
│   └── clients/                # python ml client, sentience client
├── services/
│   ├── ml-py/                  # Python FastAPI ML
│   │   ├── app.py
│   │   └── requirements.txt
│   └── sentience-rs/           # Rust crate + tiny HTTP wrapper (Axum)
│       ├── Cargo.toml
│       └── src/main.rs
├── ui/                         # React (Vite)
│   ├── index.html
│   ├── src/App.tsx
│   └── package.json
├── Makefile
└── .env.example
```

---

## Running (dev mode)

Make sure you have Go, Python, Rust, and Node.js installed.

```bash
make sentience    # Rust service on :7070
make ml           # Python ML service on :9090
make gateway      # Go backend on :8080
make ui           # Vite UI on :5173
```

Then open <http://localhost:5173> in your browser.

## More

Full documentation and technical rationale lives in the /docs folder.
Start with 1_GOAL_INTERPRETATION.md.
