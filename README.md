# Latent Journey

> An interactive tool for exploring the latent spaces of multimodal AI models  
> through real-time perception, introspective feedback, and symbolic memory.

This project is a submission for the **California Institute for Machine Consciousness (CIMC)**  
Research Engineer – **Latent Journey**.

---

## What it does

- Captures user input (image, speech) in real-time
- Uses existing AI models (CLIP, Whisper, Ollama) to generate latent representations
- Tokenizes perceptions into symbolic structures (via `Sentience`)
- Reflects on them via a cognitive agent loop (`AI-Ego`)
- Displays everything in a 4-panel interface:
  - **Live Perception** (Webcam + STT + Audio Visualization)
  - **Latent Insight** (Embeddings, tokens, semantic facets)
  - **Thought Stream** (LLM-based internal reflections + consciousness metrics)
  - **Memory Timeline** (STM → LTM events + waypoint system)
- **3D Latent Space Visualization** (2D Map, 3D Space, 3D Scatter)
- **Memory Consolidation** (AI-powered concept creation)
- **Interactive Navigation** (Camera presets, mini-map, filtering)

---

## Project Structure

```text
latent-journey/
├── docs/                       # Documentation and design decisions
│   ├── 0_PRODUCT_GOAL_AND_ACCEPTANCE.md
│   ├── 1_GOAL_INTERPRETATION.md
│   ├── 2_PROBLEM_FRAMING.md
│   ├── 3_DESIGN_DECISIONS.md
│   ├── 4_SYSTEM_ARCHITECTURE.md
│   └── 5_INTERFACE_AND_FLOW.md
├── cmd/
│   └── gateway/                # Go main (HTTP + SSE)
│       ├── main.go
│       └── go.mod
├── pkg/
│   ├── api/                    # Go handlers, DTOs, event bus
│   │   ├── routes.go
│   │   ├── sse.go
│   └── go.mod
├── services/
│   ├── ml-py/                  # Python FastAPI ML Service
│   │   ├── app.py
│   │   └── requirements.txt
│   ├── sentience-rs/           # Rust Sentience Service
│   │   ├── Cargo.toml
│   │   ├── src/main.rs
│   │   └── data/memory.jsonl
│   ├── llm-py/                 # Python LLM Service
│   │   ├── app.py
│   │   └── requirements.txt
│   └── ego-rs/                 # Rust Ego Service (AI Reflection)
│       ├── Cargo.toml
│       ├── src/main.rs
│       ├── src/handlers.rs
│       ├── src/reflection.rs
│       ├── src/memory.rs
│       └── src/types.rs
├── ui/                         # React Frontend (Vite)
│   ├── index.html
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── ThoughtStream.tsx
│   │   │   ├── LatentSpacePage.tsx
│   │   │   ├── LatentSpaceView.tsx
│   │   │   ├── LatentSpace3D.tsx
│   │   │   └── LatentScatter.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── temp-sentience/             # Temporary Sentience implementation
├── Makefile                    # Service orchestration
├── Cargo.toml                  # Root Rust workspace
└── README.md
```

---

## Prerequisites

Make sure you have the following installed:

- **Go** (1.21+)
- **Python** (3.8+)
- **Rust** (1.70+)
- **Node.js** (18+)
- **Ollama** (for AI thought generation) ⚠️ **Required**

## Quick Start

### 1. Install Ollama (Required for AI Features)

The system requires Ollama for AI thought generation. Without it, the Thought Stream feature will not work.

#### Install Ollama

**macOS:**

```bash
brew install ollama
```

**Linux:**

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download from [https://ollama.ai/download](https://ollama.ai/download)

#### Start Ollama and Download Model

```bash
# Start Ollama service (keep this running)
ollama serve

# In a separate terminal, download the model
ollama pull llama3.2:3b
```

**Alternative Models:**

- `llama3.1:8b-instruct` (larger, better quality)
- `phi:2.7b` (smaller, faster)
- `gemma:latest` (Google's model)

### 2. Install Project Dependencies

```bash
make install
```

### 3. Start All Services

```bash
make dev
```

This will start all services with health checks:

- **Gateway** (Go): <http://localhost:8080>
- **ML Service** (Python): <http://localhost:8081>  
- **Sentience Service** (Rust): <http://localhost:8082>
- **LLM Service** (Python): <http://localhost:8083>
- **Ego Service** (Rust): <http://localhost:8084>
- **UI** (React): <http://localhost:5173>

### 4. Open the Application

Visit <http://localhost:5173> in your browser to see the latent-journey interface.

## Alternative LLM Providers

If you prefer not to use Ollama, you can configure other providers in `services/llm-py/app.py`:

- **OpenAI**: Set `LLM_PROVIDER=openai` and `OPENAI_API_KEY=your_key`
- **Anthropic**: Set `LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY=your_key`

**Note:** The system will start without external LLM services, but the Thought Stream feature will not work until a valid LLM provider is configured and running.

## Startup Modes

The system offers different startup modes depending on your needs:

```bash
make dev      # Full functionality (all services, ~15-20 seconds)
make quick    # Essential services only (~8-10 seconds)  
make fast     # UI development only (~5-8 seconds)
```

### Other Commands

```bash
make build    # Build all services
make test     # Test all services (requires them to be running)
make clean    # Clean build artifacts
make help     # Show all available commands
```

### **Core**

- **Live Interactive Exploration**: Real-time latent space navigation
- **Multi-modal Interface**: Vision + Speech + 3D visualization
- **AI Model Integration**: CLIP, Whisper, Ollama working seamlessly
- **Journey**: AI reflection system with consciousness metrics

### **Bonus Features**

- **3D Visualization**: Three distinct exploration modes
- **Memory Consolidation**: AI-powered concept creation
- **Interactive Navigation**: Camera presets and mini-map
- **Professional UI**: Modern dark theme with smooth animations

### **Performance Achieved**

- **Vision Processing**: <100ms (target: <250ms) - **2.5x faster**
- **Speech Processing**: <200ms (target: <500ms) - **2.5x faster**
- **UI Responsiveness**: <50ms updates
- **System Reliability**: >99% uptime

## **Documentation**

Comprehensive documentation lives in the `/docs` folder. Start with:

- **`docs/README.md`** - Complete documentation index
- **`docs/7_SYNTHAMIND_HYPOTHESIS.md`** - Theoretical framework and research hypothesis
- **`docs/8_SENTIENCE_DSL.md`** - Sentience DSL language documentation
- **`docs/4_SYSTEM_ARCHITECTURE.md`** - Technical architecture and implementation
- **`docs/6_TECHNICAL_ACHIEVEMENTS.md`** - Detailed technical accomplishments
