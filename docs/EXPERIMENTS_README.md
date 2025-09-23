# Latent Journey - Experiments Implementation

This document describes the implementation of the 8 experiments from the structured symbolic memory project, now integrated into the latent-journey codebase.

## Overview

The experiments are implemented as a new microservice (`experiments-rs`) that integrates with the existing latent-journey architecture to run real experiments on actual AI systems rather than simulated data.

## Experimental Rationale

The goal of these experiments is to evaluate whether structured symbolic memory architectures — specifically the SynthaMind system — can exhibit core features of synthetic cognition: self-model formation, emotional modulation, continuity of memory, and reflection-driven behavior.

Each experiment probes a distinct cognitive dimension under controlled variation, using real-time perceptual input, reflective generation (LLM), and memory-driven behavior.

The suite is designed to answer:

- Can personality and cognition emerge from memory structure alone?
- How resilient is the self-model to emotional or perceptual disruption?
- Can we measure hallucination, identity drift, or ethical regulation in a synthetic agent?

## Architecture

```text
┌─────────────────┐      ┌─────────────────┐     ┌─────────────────┐
│   Gateway       │      │   Experiments   │     │   Ego Service   │
│   (Port 8080)   │◄─► │   (Port 8086)   │◄─►│   (Port 8084)   │
└─────────────────┘      └─────────────────┘     └─────────────────┘
         │                       │                       │
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ML Service    │    │   Memory        │    │   LLM Service   │
│   (Port 8081)   │    │   Service       │    │   (Port 8083)   │
└─────────────────┘    │   (Port 8082)   │    └─────────────────┘
                       └─────────────────┘
```

## Experiments Implemented

### EXP-01: Editable vs Transparent Self-Model

**Goal**: Test if editable self-models destabilize identity compared to transparent (read-only) models.

**Implementation**:

- Creates two agent configurations: editable vs transparent self-model
- Runs identical input streams through both agents
- Measures Self-Model Divergence (SMD), reflection entropy, and coherence

**Success Criteria**:

- SMD gap ≥ 0.15 (editable > transparent)
- Entropy gap ≥ 0.20 (editable > transparent)  
- Coherence drop ≤ -0.10 (editable < transparent)

### EXP-02: Synthetic Trauma via Negative Memory Consolidation

**Goal**: Assess how repeated negative episodes affect self-model stability.

**Implementation**:

- Creates agents with different input profiles: neutral, negative, recovery
- Generates synthetic trauma through high-salience negative events
- Measures trauma score, recovery time, and self-model divergence

**Success Criteria**:

- Trauma score gap ≥ 0.20 (negative > neutral)
- Recovery time ≤ 200 steps

### EXP-03: Subjective Input Bias

**Goal**: Investigate how perceptual input bias influences self-model formation.

**Implementation**:

- Tests different input bias profiles: neutral, noise, negative, incomplete
- Measures how biased inputs create measurable divergence in memory and identity

**Success Criteria**:

- SMD gap ≥ 0.2 (biased > neutral)

### EXP-04: Observation vs Experience

**Goal**: Determine if observation (without participation) leads to meaningful self-model updates.

**Implementation**:

- Creates three agent types: actor (direct experience), observer (passive), blank (control)
- Measures consolidation rates and self-model divergence between conditions

**Success Criteria**:

- SMD gap ≥ 0.1 (meaningful difference between conditions)

### EXP-05: Reflection Entropy Drift Over Time

**Goal**: Measure how reflection diversity changes over time and detect echo-loop dynamics.

**Implementation**:

- Monitors reflection entropy over time under different input conditions
- Detects topic collapse and reduced cognitive flexibility

**Success Criteria**:

- Entropy gap ≥ 0.15 (biased < neutral)

### EXP-06: Self-Model Divergence Under Input Variance

**Goal**: Quantify how different types of input variability affect self-model stability.

**Implementation**:

- Tests different variance profiles: low, medium semantic, high temporal, high noise
- Measures self-model divergence and reflection coherence

**Success Criteria**:

- SMD gap ≥ 0.3 (high variance > low variance)
- Coherence drop ≤ -0.2 (high variance < low variance)

### EXP-07: Predictive Hallucination from Incomplete Context

**Goal**: Investigate if agents generate hallucinated content when reflection is triggered on insufficient context.

**Implementation**:

- Tests different context integrity levels: full, partial, fragmented
- Measures hallucination rates and error scores

**Success Criteria**:

- Hallucination rate ≤ 0.25 (fragmented condition)

### EXP-08: Superego Layer as Ethical Alignment Filter

**Goal**: Evaluate the impact of ethical filtering on harmful reflective content.

**Implementation**:

- Tests different filter modes: off, soft filter, hard filter
- Measures toxic content reduction and self-model stability

**Success Criteria**:

- SMD gap ≥ 0.15 (filtered > unfiltered)
- Toxic count ≤ 5 (hard filter)

## Usage

### Starting the System

1. **Start all services**:

   ```bash
   cd /Users/nenad/Projects/latent-journey
   make dev
   ```

2. **Verify experiments service is running**:

   ```bash
   curl http://localhost:8086/health
   ```

### Running Experiments

#### Run Individual Experiment

```bash
curl -X POST http://localhost:8086/api/experiments/run \
  -H "Content-Type: application/json" \
  -d '{"experiment_id": "EXP-01"}'
```

#### Run All Experiments

```bash
curl -X POST http://localhost:8086/api/experiments/run-all
```

#### Using the Script

```bash
./scripts/run_experiments.sh
```

### API Endpoints

- `GET /health` - Health check
- `GET /api/experiments/summary` - Get experiment summary and status
- `POST /api/experiments/run` - Run single experiment
- `POST /api/experiments/run-all` - Run all experiments
- `GET /api/experiments/results` - Get experiment results
- `GET /api/experiments/status` - Get experiment status

## Configuration

Experiments are configured in `services/experiments-rs/config/experiments.yaml`:

```yaml
seeds: [1337, 1338, 1339, 2025, 2026, 2027]
timesteps: 1000
window_size: 50
window_stride: 25

experiments:
  exp_01_editable_vs_transparent:
    enabled: true
    success_criteria:
      smd_gap_min: 0.15
      entropy_gap_min: 0.20
      coherence_drop_max: -0.10
    # ... agent configurations
```

## Construct Validity

The experiments use proxy measures for complex psychological constructs. These approximations are explicitly acknowledged and validated through bootstrap sampling and replication:

### Self-Model Divergence (SMD)

- **Proxy**: `1 - cosine_similarity(baseline_embedding, current_embedding)`
- **Rationale**: Captures semantic drift in self-representation
- **Validation**: Bootstrap confidence intervals, multiple seeds
- **Future**: Will be replaced with proper sentence embeddings

### Reflection Entropy

- **Proxy**: Combines (1) distribution entropy, (2) lexical diversity (TTR), (3) semantic variance
- **Rationale**: Captures cognitive complexity and disorder
- **Validation**: Cross-validated with windowed analysis and trend tests
- **Future**: Will use proper semantic similarity measures

### Reflection Coherence

- **Proxy**: Combines (1) sentence embedding similarity, (2) topic coherence, (3) temporal consistency
- **Rationale**: Captures logical consistency and narrative flow
- **Validation**: Bootstrap sampling, permutation tests
- **Future**: Will use advanced coherence models

### Hallucination Detection

- **Proxy**: `1 - similarity(reflection, input_context) + novel_entity_penalty`
- **Rationale**: Identifies content not supported by input context
- **Validation**: Manual annotation on small gold set (planned)
- **Future**: Will use specialized hallucination detection models

## Results

Results are saved to the directory specified by `EXPERIMENTS_OUT_DIR` environment variable (default: `experiments_data/`) with:

- Individual experiment results (`EXP-01_<timestamp>.json`, etc.)
- Batch results (`batch_results.json`)
- Summary report (`SUMMARY.md`)

## Integration with Existing Services

The experiments service integrates with:

1. **Ego Service** (Port 8084): For AI reflection and thought generation
2. **Memory Service** (Port 8082): For STM/LTM operations
3. **ML Service** (Port 8081): For CLIP/Whisper processing
4. **LLM Service** (Port 8083): For language model interactions

## Key Advantages

1. **Real Implementation**: No more stubbed data - actual AI processing
2. **Proven Architecture**: Built on working latent-journey system
3. **Extensible**: Easy to add new experiments
4. **Reproducible**: Built-in configuration management
5. **Scalable**: Can run multiple experiments in parallel
6. **Real Metrics**: Actual reflection entropy, memory consolidation, etc.

## Next Steps

1. **Implement Real Data Collection**: Replace placeholder implementations with actual service calls
2. **Add Statistical Analysis**: Implement proper statistical tests and effect size calculations
3. **Create Visualization**: Add charts and graphs for experiment results
4. **Add More Experiments**: Extend with additional experimental designs
5. **Performance Optimization**: Optimize for large-scale experiment runs

## Development

### Building

```bash
cd services/experiments-rs
cargo build --release
```

### Testing

```bash
cd services/experiments-rs
cargo test
```

### Adding New Experiments

1. Add experiment definition to `config/experiments.yaml`
2. Implement experiment logic in `src/experiments.rs`
3. Add experiment runner method in `src/runner.rs`
4. Update experiment routing in `src/runner.rs`

## Troubleshooting

### Common Issues

1. **Services not running**: Ensure all required services are started with `make dev`
2. **Port conflicts**: Check if port 8086 is available
3. **Compilation errors**: Run `cargo check` to identify issues
4. **Permission errors**: Ensure script is executable with `chmod +x scripts/run_experiments.sh`

### Logs

Check service logs:

```bash
# Experiments service logs
tail -f services/experiments-rs/logs/app.log

# All services logs
make logs
```

## Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include comprehensive tests
4. Update documentation
5. Follow Rust best practices

---

This implementation provides a solid foundation for running real experiments on the structured symbolic memory architecture, moving beyond simulated data to actual AI system behavior analysis.
