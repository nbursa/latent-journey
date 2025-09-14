use crate::types::{Memory, Modality};
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, Write};

pub struct MemoryStore {
    memories: HashMap<String, Memory>,
    concepts: HashMap<String, Vec<String>>, // concept_id -> child_memory_ids
    file_path: String,                      // Path to the memory.jsonl file
}

impl MemoryStore {
    pub fn new() -> Self {
        Self {
            memories: HashMap::new(),
            concepts: HashMap::new(),
            file_path: "data/memory.jsonl".to_string(), // LTM file in ego-rs/data
        }
    }

    pub fn new_with_path(file_path: String) -> Self {
        Self {
            memories: HashMap::new(),
            concepts: HashMap::new(),
            file_path,
        }
    }

    pub fn load_from_jsonl(&mut self, file_path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let file = File::open(file_path)?;
        let reader = BufReader::new(file);

        for line in reader.lines() {
            let line = line?;
            if line.trim().is_empty() {
                continue;
            }

            let memory_event: serde_json::Value = serde_json::from_str(&line)?;

            let id = memory_event["embedding_id"]
                .as_str()
                .unwrap_or("unknown")
                .to_string();
            let ts = memory_event["ts"].as_u64().unwrap_or(0) as i64;
            let source = memory_event["source"].as_str().unwrap_or("text");
            let facets = memory_event["facets"]
                .as_object()
                .unwrap_or(&serde_json::Map::new())
                .clone();

            let modality = match source {
                "vision" => Modality::Vision,
                "speech" => Modality::Speech,
                "concept" => Modality::Concept,
                _ => Modality::Text,
            };

            // Handle both unconsolidated (from sentience-rs) and consolidated (from ego-rs) memories
            let memory = Memory {
                id: id.clone(),
                timestamp: DateTime::from_timestamp(ts, 0).unwrap_or_else(|| Utc::now()),
                modality,
                embedding: memory_event["embedding"]
                    .as_array()
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_f64())
                            .map(|f| f as f32)
                            .collect()
                    })
                    .unwrap_or_default(),
                content: memory_event["content"].as_str().unwrap_or("").to_string(),
                facets: facets.into_iter().map(|(k, v)| (k, v)).collect(),
                tags: memory_event["tags"]
                    .as_array()
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|v| v.as_str())
                            .map(|s| s.to_string())
                            .collect()
                    })
                    .unwrap_or_default(),
            };

            self.memories.insert(id, memory);
        }

        Ok(())
    }

    pub fn load_ltm_from_jsonl(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let file_path = self.file_path.clone();
        self.load_from_jsonl(&file_path)
    }

    pub fn load_unconsolidated_from_sentience(
        &mut self,
        file_path: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.load_from_jsonl(file_path)
    }

    pub fn save_to_jsonl(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&self.file_path)?;

        for memory in self.memories.values() {
            // Convert Memory to the format expected by sentience-rs
            let memory_event = serde_json::json!({
                "embedding_id": memory.id,
                "ts": memory.timestamp.timestamp(),
                "source": match memory.modality {
                    Modality::Vision => "vision",
                    Modality::Speech => "speech",
                    Modality::Text => "text",
                    Modality::Concept => "concept",
                },
                "facets": memory.facets,
                "content": memory.content,
                "tags": memory.tags,
                "embedding": memory.embedding
            });

            writeln!(file, "{}", serde_json::to_string(&memory_event)?)?;
        }

        Ok(())
    }

    pub fn append_memory_to_jsonl(
        &self,
        memory: &Memory,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.file_path)?;

        let memory_event = serde_json::json!({
            "embedding_id": memory.id,
            "ts": memory.timestamp.timestamp(),
            "source": match memory.modality {
                Modality::Vision => "vision",
                Modality::Speech => "speech",
                Modality::Text => "text",
                Modality::Concept => "concept",
            },
            "facets": memory.facets,
            "content": memory.content,
            "tags": memory.tags,
            "embedding": memory.embedding
        });

        writeln!(file, "{}", serde_json::to_string(&memory_event)?)?;
        Ok(())
    }

    pub fn add_memory(&mut self, memory: Memory) {
        self.memories.insert(memory.id.clone(), memory);
    }

    pub fn add_memory_and_save(
        &mut self,
        memory: Memory,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.memories.insert(memory.id.clone(), memory.clone());
        self.append_memory_to_jsonl(&memory)?;
        Ok(())
    }

    pub fn save_all_memories(&self) -> Result<(), Box<dyn std::error::Error>> {
        self.save_to_jsonl()
    }

    pub fn get_memory(&self, id: &str) -> Option<&Memory> {
        self.memories.get(id)
    }

    pub fn get_recent_memories(&self, limit: usize, time_window_minutes: u64) -> Vec<&Memory> {
        let cutoff = Utc::now() - chrono::Duration::minutes(time_window_minutes as i64);

        let mut recent: Vec<&Memory> = self
            .memories
            .values()
            .filter(|m| m.timestamp >= cutoff)
            .collect();

        recent.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        recent.truncate(limit);
        recent
    }

    pub fn get_memories_by_modality(&self, modality: &Modality) -> Vec<&Memory> {
        self.memories
            .values()
            .filter(|m| std::mem::discriminant(&m.modality) == std::mem::discriminant(modality))
            .collect()
    }

    pub fn create_concept(&mut self, concept_id: String, child_ids: Vec<String>, _title: String) {
        self.concepts.insert(concept_id.clone(), child_ids);

        // Mark child memories as consolidated
        for child_id in &self.concepts[&concept_id] {
            if let Some(memory) = self.memories.get_mut(child_id) {
                memory
                    .facets
                    .insert("consolidated".to_string(), serde_json::Value::Bool(true));
                memory.facets.insert(
                    "concept_id".to_string(),
                    serde_json::Value::String(concept_id.clone()),
                );
            }
        }
    }

    pub fn get_concept_children(&self, concept_id: &str) -> Vec<&Memory> {
        self.concepts
            .get(concept_id)
            .map(|child_ids| {
                child_ids
                    .iter()
                    .filter_map(|id| self.memories.get(id))
                    .collect()
            })
            .unwrap_or_default()
    }

    pub fn get_all_memories(&self) -> Vec<&Memory> {
        self.memories.values().collect()
    }

    pub fn get_concept_memories(&self) -> Vec<&Memory> {
        self.memories
            .values()
            .filter(|m| matches!(m.modality, Modality::Concept))
            .collect()
    }

    pub fn get_consolidation_stats(&self) -> ConsolidationStats {
        let total = self.memories.len();
        let consolidated = self
            .memories
            .values()
            .filter(|m| {
                m.facets
                    .get("consolidated")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
            })
            .count();
        let concepts = self.concepts.len();

        ConsolidationStats {
            total_memories: total,
            concept_count: concepts,
            consolidated_count: consolidated,
            consolidation_rate: if total > 0 {
                consolidated as f32 / total as f32
            } else {
                0.0
            },
        }
    }
}

#[derive(Debug, Clone)]
pub struct ConsolidationStats {
    pub total_memories: usize,
    pub concept_count: usize,
    pub consolidated_count: usize,
    pub consolidation_rate: f32,
}

// Helper functions for memory selection and processing
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }

    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot_product / (norm_a * norm_b)
    }
}

pub fn select_relevant_memories<'a>(
    memories: &'a [&'a Memory],
    focus_embedding: Option<&'a [f32]>,
    max_count: usize,
) -> Vec<&'a Memory> {
    let mut selected = memories.to_vec();

    // Sort by relevance if focus embedding is provided
    if let Some(focus) = focus_embedding {
        selected.sort_by(|a, b| {
            let score_a = cosine_similarity(&a.embedding, focus);
            let score_b = cosine_similarity(&b.embedding, focus);
            score_b
                .partial_cmp(&score_a)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
    } else {
        // Sort by recency
        selected.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    }

    // Ensure diversity by modality
    let mut by_modality: HashMap<String, Vec<&Memory>> = HashMap::new();
    for memory in selected {
        let modality_key = match memory.modality {
            Modality::Vision => "vision",
            Modality::Speech => "speech",
            Modality::Text => "text",
            Modality::Concept => "concept",
        }
        .to_string();

        by_modality.entry(modality_key).or_default().push(memory);
    }

    let mut result = Vec::new();
    let limits = [8, 8, 8, 4]; // vision, speech, text, concept
    let modalities = ["vision", "speech", "text", "concept"];

    for (modality, limit) in modalities.iter().zip(limits.iter()) {
        if let Some(memories) = by_modality.get(*modality) {
            result.extend(memories.iter().take(*limit));
        }
    }

    result.truncate(max_count);
    result
}

pub fn average_embedding(embeddings: &[Vec<f32>]) -> Vec<f32> {
    if embeddings.is_empty() {
        return Vec::new();
    }

    let dimensions = embeddings[0].len();
    let mut result = vec![0.0; dimensions];

    for embedding in embeddings {
        for (i, &value) in embedding.iter().enumerate() {
            if i < dimensions {
                result[i] += value;
            }
        }
    }

    // Normalize by count
    let count = embeddings.len() as f32;
    for value in &mut result {
        *value /= count;
    }

    result
}
