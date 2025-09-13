# 1_GOAL_INTERPRETATION — Latent Journey

## 1) Problem Statement

Modern AI models encode inputs u visoko‑dimenzionalnim latentnim prostorima koje korisnik ne vidi. Bez uvida u tu reprezentaciju, saradnja čovek–AI je neprozirna, teže je uočiti ograničenja i doneti poverljive odluke.

## 2) Goal (Single Source of Truth)

Build a live, interactive tool that lets a human **navigate and understand** a model’s latent representations (vision + speech), with a UI that shows:

- what the model **perceives** (top‑k, embeddings),
- how it gets **tokenized** into **semantic facets** (Sentience DSL),
- and how an **AI‑Ego** reflects on that state (thought stream),
all in real time.

## 3) User Value Hypothesis

If users can see and steer latent representations, they will:

- understand model behavior & limits faster,
- form better prompts/actions,
- and trust outcomes more (with appropriate disclaimers).

## 4) Non‑Goals (for this prototype)

- No formal causal attribution/explanations.
- No heavy generative edits in the critical path (only optional).
- No cloud dependence; privacy by default (local dev).

## 5) Success Criteria (Objective)

- **S1 — Interactivity:** user changes input → UI updates **<250 ms** (vision), **<500 ms** (speech).
- **S2 — Latent Transparency:** UI shows **perception → tokens → thought** chain for each event.
- **S3 — Insightfulness:** at least **3** meaningful semantic facets per event (e.g., `vision.object`, `speech.intent`, `affect.valence`).
- **S4 — Journey Quality:** user can **bookmark and revisit** at least **5** waypoints and compare A/B states.
- **S5 — Safety Copy:** UI contains visible notes that “statistical representation ≠ understanding”.

## 6) Demo Story (Acceptance for CIMC)

1. Show an object to camera; see **CLIP top‑k** and **Sentience facets** update live.
2. Say “Hello agent.”; see **Whisper transcript** → **speech.intent = greeting**, **affect.valence > 0**.
3. Switch objects (e.g., banana → mug); observe **facet changes** + **thought stream** reflection.
4. Save 2–3 **waypoints**, open **Memory timeline**, and compare states (A/B).
5. (Optional) Show 2D latent map trail (UMAP) of this short journey.

## 7) Risks & Mitigations (short)

- Over‑interpretation → prominent disclaimers; progressive disclosure.
- Latency spikes → cache, smaller models; async thought panel.
- UX clutter → minimalist defaults; details on demand.

## 8) Metrics & Evaluation Plan

- Time‑to‑insight (user identifies model mislabel/limit) < 2 min.
- Task: “Find 2 different states with distinct `vision.object` and `speech.intent`” — success rate > 90%.
- Micro‑survey (1–5): perceived transparency ≥ 4.5.
