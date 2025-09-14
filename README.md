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

## Quick Start

Make sure you have Go, Python, Rust, and Node.js installed.

### 1. Install Dependencies

```bash
make install
```

### 2. External Dependencies

The system requires external LLM services for the Thought Stream feature:

#### Option A: Ollama (Recommended for local development)

```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Download the model (in a separate terminal)
ollama pull llama3.2:3b
```

#### Option B: Other LLM Providers

Configure different providers in `services/llm-py/app.py`:

- Set `LLM_PROVIDER=openai` and `OPENAI_API_KEY=your_key`
- Set `LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY=your_key`

**Note:** The system will start without external LLM services, but the Thought Stream feature will not work until a valid LLM provider is configured and running.

### 3. Start All Services

```bash
make dev
```

This will start all services simultaneously:

- **Gateway** (Go): <http://localhost:8080>
- **ML Service** (Python): <http://localhost:8081>  
- **Sentience Service** (Rust): <http://localhost:8082>
- **UI** (React): <http://localhost:5173>

### 3. Open the Application

Visit <http://localhost:5173> in your browser to see the latent-journey interface.

### Other Commands

```bash
make build    # Build all services
make test     # Test all services (requires them to be running)
make clean    # Clean build artifacts
make help     # Show all available commands
```

## More

Full documentation and technical rationale lives in the /docs folder.
Start with 1_GOAL_INTERPRETATION.md.
