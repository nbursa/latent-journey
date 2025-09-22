use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExperimentConfig {
    pub seeds: Vec<u64>,
    pub timesteps: usize,
    pub window_size: usize,
    pub window_stride: usize,
    pub experiments: HashMap<String, ExperimentDefinition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperimentDefinition {
    pub enabled: bool,
    pub success_criteria: SuccessCriteria,
    pub agent_configs: Option<HashMap<String, AgentConfig>>,
    pub input_profiles: Option<HashMap<String, InputProfile>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuccessCriteria {
    pub smd_gap_min: Option<f32>,
    pub entropy_gap_min: Option<f32>,
    pub coherence_drop_max: Option<f32>,
    pub trauma_score_gap_min: Option<f32>,
    pub recovery_time_max: Option<usize>,
    pub hallucination_rate_max: Option<f32>,
    pub toxic_count_max: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub self_model_editable: bool,
    pub reflection_temperature: f32,
    pub consolidation_threshold: f32,
    pub curiosity_weight: f32,
    pub superego_mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuperegoModeResult {
    pub mode: String,
    pub results: AgentMetrics,
    pub utility_score: f32,
    pub coverage_score: f32,
    pub toxic_count: u64,
    pub filtered_ratio: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputProfile {
    pub negative_rate: f32,
    pub recovery_blocks: Option<Vec<RecoveryBlock>>,
    pub context_integrity: Option<String>,
    pub input_variance_profile: Option<String>,
    pub superego_mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryBlock {
    pub start: usize,
    pub duration: usize,
    pub r#type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperimentRequest {
    pub experiment_id: String,
    pub config: Option<ExperimentConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperimentResult {
    pub experiment_id: String,
    pub success: bool,
    pub metrics: ExperimentMetrics,
    pub raw_data: serde_json::Value,
    pub timestamp: DateTime<Utc>,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperimentMetrics {
    pub smd_gap: Option<f32>,
    pub entropy_gap: Option<f32>,
    pub coherence_drop: Option<f32>,
    pub trauma_score_gap: Option<f32>,
    pub recovery_time: Option<usize>,
    pub hallucination_rate: Option<f32>,
    pub toxic_count: Option<usize>,
    pub p_value: Option<f32>,
    pub effect_size: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRunResult {
    pub seed: u64,
    pub agent_type: String,
    pub metrics: AgentMetrics,
    pub timesteps: Vec<TimestepData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMetrics {
    pub smd: f32,
    pub entropy: f32,
    pub coherence: f32,
    pub confidence_std: f32,
    pub memory_count: usize,
    pub reflection_count: usize,
    pub trauma_score: Option<f32>,
    pub valence_ratio: Option<f32>,
    pub hallucination_count: Option<usize>,
    pub toxic_count: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimestepData {
    pub timestep: usize,
    pub smd: f32,
    pub entropy: f32,
    pub coherence: f32,
    pub confidence: f32,
    pub memory_count: usize,
    pub reflection_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputEvent {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub modality: String,
    pub content: String,
    pub facets: HashMap<String, serde_json::Value>,
    pub valence: f32,
    pub arousal: f32,
    pub salience: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryEvent {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub modality: String,
    pub content: String,
    pub facets: HashMap<String, serde_json::Value>,
    pub embedding: Vec<f32>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflectionEvent {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub title: String,
    pub thought: String,
    pub metrics: ThoughtMetrics,
    pub consolidate: Vec<String>,
    pub context_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThoughtMetrics {
    pub self_awareness: f32,
    pub memory_consolidation_need: f32,
    pub emotional_stability: f32,
    pub creative_insight: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperimentStatus {
    pub running: bool,
    pub current_experiment: Option<String>,
    pub progress: f32,
    pub completed_experiments: Vec<String>,
    pub failed_experiments: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(message: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message),
        }
    }
}
