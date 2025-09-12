# 3_DESIGN_DECISIONS

## Scope & Success Criteria

- **Scope:** Interactive tool that allows the user to explore latent spaces of visual and language models in real time, through a simple GUI.
- **Success:** (1) user actively changes inputs and sees changes in latent representation; (2) system clearly shows “what the model saw/heard/thought”; (3) demonstrates practical understanding of how models encode reality.

## Models & Rationale

- **Vision:** CLIP / OpenCLIP (image → embedding, labels)
  - _Why:_ robust, fast, widely adopted for semantic similarity.
- **Speech → Text:** Whisper (or local Vosk if no GPU)
  - _Why:_ stable STT for real-time prototype.
- **Text Reflection:** LLM (GPT/Mistral/Ollama)
  - _Why:_ generates “thought”/reflection to interpret perceptions.
- **(Optional) Generative:** SD/SDXL or VAE for “latent morphs”
  - _Why:_ demonstration of movement within generative latent (bonus).

## Architecture Choices

- **Modular:** `perception/` (camera, mic), `sentience/` (token DSL), `memory/` (STM+LTM), `ai-ego/` (control loop), `ui/` (web).
- **Data Flow:** stream-first (event-driven) – every input change emits updates to UI.
- **Memory:** STM (sliding window of last N events) + LTM (Inception server) with tagging (reward/valence).
- **Tokenization:** Sentience DSL converts unstructured embeddings into semantic tokens (e.g. `vision.object: "cat"`; `speech.intent: "question"`).
- **Latency Targets:** ~100–250 ms for UI update after event (without heavy generative steps).

## Interface Decisions

- **4-panels UI:** (1) Live Perception, (2) Latent Insight, (3) Thought Stream, (4) Memory Timeline.
- **User Steering:** upload/image/webcam, mic push‑to‑talk, textbox; optional reward (+/–).
- **Explainability Hints:** nearest neighbors, top‑k labels, attention-ish salience (proxy), confidence bands.

## Constraints & Trade-offs

- **Compute:** prefer real-time > perfect accuracy.
- **Explainability:** focus on “useful interpretation”, not formal attribution methods.
- **Privacy:** local processing of audio/image in dev mode; explicitly mark if sent outside.
- **Robustness:** degradation without GPU (disable generative, smaller models).

## Risks & Mitigations

- **R1 (Over-interpretation):** user thinks “AI understands”.  
  _Mitigation:_ disclaimers + UI copy “statistical representation ≠ understanding”.
- **R2 (Latency Spikes):** slow LLM/SD.  
  _Mitigation:_ asynchronous “thought” panel, caching, smaller models.
- **R3 (UX clutter):** too many metrics.  
  _Mitigation:_ progressive disclosure (expand details on demand).

## Testing Strategy

- **Scenario scripts:** 5 typical use cases (object in front of camera, homonyms in speech, manipulation of similar images, reward loop, failure cases).
- **Observability:** console events + lightweight telemetry in dev mode.

## Reflection on Latent Misalignment (Meta Insight)

This document was initially written in Serbian, which unintentionally introduced a mismatch between the system's internal context (developer-local) and the intended audience (CIMC reviewers).

This is a perfect example of the very problem `latent-journey` attempts to address: when internal representations (latent understanding) are not expressed in a way the receiver can interpret correctly, trust and alignment break down.

As such, this experience reaffirms a key architectural decision: the need for `ai-ego` to act as a translator between model cognition and human comprehension — not just exposing embeddings, but translating them into structured, interpretable, and semantically aligned expressions.
