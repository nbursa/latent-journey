use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Memory {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub modality: Modality,
    pub embedding: Vec<f32>,
    pub content: String,
    pub facets: HashMap<String, serde_json::Value>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Modality {
    Vision,
    Speech,
    Text,
    Concept,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EgoThought {
    pub id: String,
    pub title: String,
    pub thought: String,
    pub metrics: ThoughtMetrics,
    pub consolidate: Vec<String>,
    pub generated_at: DateTime<Utc>,
    pub context_hash: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThoughtMetrics {
    pub self_awareness: f32,
    pub memory_consolidation_need: f32,
    pub emotional_stability: f32,
    pub creative_insight: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityMetrics {
    pub grounding: f32,
    pub consistency: f32,
    pub specificity: f32,
    pub overall: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Experience {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub consolidated_from: Vec<String>, // IDs of STM thoughts that were consolidated
    pub created_at: DateTime<Utc>,
    pub consolidated_at: DateTime<Utc>,
    pub themes: Vec<String>, // e.g., ["conversation", "introduction", "sustainability"]
    pub emotional_tone: f32, // 0.0-1.0
    pub importance: f32,     // 0.0-1.0
    pub context_hash: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsolidationRequest {
    pub force: Option<bool>,            // Force consolidation even if not needed
    pub max_experiences: Option<usize>, // Limit number of experiences to create
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsolidationResult {
    pub experiences_created: usize,
    pub thoughts_consolidated: usize,
    pub consolidation_time: DateTime<Utc>,
    pub themes_identified: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflectionRequest {
    pub memories: Vec<Memory>,
    pub user_query: Option<String>,
    pub focus_embedding: Option<Vec<f32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryQuery {
    pub limit: Option<usize>,
    pub modality: Option<Modality>,
    pub since: Option<DateTime<Utc>>,
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
