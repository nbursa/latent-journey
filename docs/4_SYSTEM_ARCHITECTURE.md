# 4_SYSTEM_ARCHITECTURE

## High-level Diagram

```mermaid
graph TD
  subgraph User Input
    A1[Webcam] --> B1
    A2[Microphone] --> B2
    A3[Text Input] --> B3
  end

  subgraph Perception
    B1[CLIP / OpenCLIP] --> C[Sentience DSL]
    B2[Whisper STT] --> C
    B3[Direct Text Tokenizer] --> C
  end

  C --> D[Short-Term Memory (STM)]
  C --> G[Thought Loop (AI‑Ego)]

  subgraph Memory
    D --> E[Long-Term Memory (LTM - Inception)]
  end

  G --> D
  G --> E
  G --> F[Thought Stream]

  subgraph User Interface
    F --> UI1[Panel: Thought Stream]
    C --> UI2[Panel: Latent Insight]
    B1 --> UI3[Panel: Live Perception]
    D --> UI4[Panel: Memory Timeline]
  end

  click F href "<https://github.com/nbursa/latent-journey>" "Project Repo"
```

## Modules

### 1 Perception (`/src/perception`)

- **Vision:** frame capture → CLIP/OpenCLIP → top‑k labels + embedding vector
- **Speech:** mic → Whisper → transcript (+ optional sentiment/topic)
- Emits structured events to Sentience DSL: `vision.observation`, `speech.transcript`, `text.input`

### 2 Sentience DSL (`/src/sentience`)

- Translates raw events into semantic tokens:
  - `vision.object`, `vision.scene`, `speech.intent`, `text.entity`, `affect.valence`
- Normalizes and enriches: e.g., mapping labels into an ontology (WordNet/ConceptNet-lite)
- Produces symbolic-perceptual streams for Memory
- Emits: `sentience.token`

### 3 Memory (`/src/memory`)

- **STM:** recent window (the last N seconds/tokens)
- **LTM (Inception):** persistent store with metadata: `{timestamp, tokens, thoughts, reward}`
- Supports queries, filtering, and temporal navigation

### 4 AI‑Ego (`/src/ai-ego`)

- Loop every T ms:
  1. reads STM (latest perceptual context)
  2. composes a context prompt (what was seen/heard, last tokens, last thought)
  3. calls the LLM → generates a `thought`
  4. writes to Memory (STM snapshot + thought), emits to UI
- Optional "attention hint": a salience heuristic (e.g., label changes, contrast).

### 5 UI (`/src/ui`)

- **Panel A – Live Perception:** camera preview, latest CLIP labels, STT transcript
- **Panel B – Latent Insight:** nearest neighbors (text/image), similarity, top‑k concepts
- **Panel C – Thought Stream:** stream of reflections (LLM), timeline
- **Panel D – Memory Timeline:** STM→LTM records, filter by event type; reward buttons (+/–)
- **Controls:** mic PTT, image upload, text input, toggle details (progressive disclosure)

## Data Contracts (Events)

```ts
// perception
type VisionObservation = {
  type: "vision.observation";
  ts: number;
  image_id: string;
  clip_topk: Array<{label: string; score: number}>;
  embedding: number[]; // optional truncated
};

type SpeechTranscript = {
  type: "speech.transcript";
  ts: number;
  text: string;
  confidence?: number;
};

// sentience
type SentienceToken = {
  type: "sentience.token";
  ts: number;
  facets: Record<string, string | number>; // e.g., { "vision.object": "cat", "affect.valence": +0.3 }
};

// thoughts
type Thought = {
  type: "ego.thought";
  ts: number;
  text: string;
  evidence?: string[]; // ids of events that informed the thought
};
```
