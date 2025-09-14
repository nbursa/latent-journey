use crate::{
    memory::{MemoryStore, select_relevant_memories, average_embedding},
    reflection::ReflectionEngine,
    types::{
        ApiResponse, ConsolidationRequest, ConsolidationResponse, EgoThought, Memory, MemoryQuery,
        Modality,
    },
};
use anyhow::Result;
use chrono::Utc;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use warp::reply::json;

pub async fn reflect(
    request: crate::types::ReflectionRequest,
    memory_store: Arc<RwLock<MemoryStore>>,
    reflection_engine: Arc<ReflectionEngine>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // Add memories to store if they don't exist
    {
        let mut store = memory_store.write().await;
        for memory in &request.memories {
            store.add_memory(memory.clone());
        }
    }

    // Get all memories for reflection (temporarily disable time filtering)
    let store = memory_store.read().await;
    let recent_memories = store.get_all_memories();
    
    // Select relevant memories
    let selected_memories = select_relevant_memories(
        &recent_memories,
        request.focus_embedding.as_deref(),
        18,
    );

    if selected_memories.is_empty() {
        return Ok(json(&ApiResponse::<EgoThought>::error(
            "No relevant memories found for reflection".to_string(),
        )));
    }

    // Generate reflection
    match reflection_engine
        .reflect_on_memories(&selected_memories, request.user_query.as_deref())
        .await
    {
        Ok(thought) => Ok(json(&ApiResponse::success(thought))),
        Err(e) => {
            tracing::error!("Reflection generation failed: {}", e);
            Ok(json(&ApiResponse::<EgoThought>::error(format!(
                "Reflection generation failed: {}",
                e
            ))))
        }
    }
}

pub async fn consolidate(
    request: ConsolidationRequest,
    memory_store: Arc<RwLock<MemoryStore>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let mut store = memory_store.write().await;
    
    // Get the memories to consolidate
    let memory_ids = request.memory_ids.clone();
    let memories: Vec<Memory> = memory_ids
        .iter()
        .filter_map(|id| store.get_memory(id).cloned())
        .collect();

    if memories.is_empty() {
        return Ok(json(&ApiResponse::<ConsolidationResponse>::error(
            "No valid memories found for consolidation".to_string(),
        )));
    }

    // Generate concept title
    let title = request.title.unwrap_or_else(|| {
        let modalities: Vec<String> = memories
            .iter()
            .map(|m| match m.modality {
                Modality::Vision => "vision".to_string(),
                Modality::Speech => "speech".to_string(),
                Modality::Text => "text".to_string(),
                Modality::Concept => "concept".to_string(),
            })
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
        
        format!("Concept from {} memories", modalities.join(", "))
    });

    // Calculate average embedding
    let embeddings: Vec<Vec<f32>> = memories.iter().map(|m| m.embedding.clone()).collect();
    let avg_embedding = average_embedding(&embeddings);

    // Create concept memory
    let concept_id = Uuid::new_v4().to_string();
    let concept_memory = Memory {
        id: concept_id.clone(),
        timestamp: Utc::now(),
        modality: Modality::Concept,
        embedding: avg_embedding,
        content: format!("Consolidated concept: {}", title),
        facets: {
            let mut facets = std::collections::HashMap::new();
            facets.insert("title".to_string(), serde_json::Value::String(title.clone()));
            facets.insert("children".to_string(), serde_json::Value::Array(
                memory_ids.iter().map(|id| serde_json::Value::String(id.clone())).collect()
            ));
            facets.insert("child_count".to_string(), serde_json::Value::Number(
                serde_json::Number::from(memories.len())
            ));
            facets.insert("consolidated_at".to_string(), serde_json::Value::String(
                Utc::now().to_rfc3339()
            ));
            facets
        },
        tags: vec!["concept".to_string(), "consolidated".to_string()],
    };

    // Add concept to store
    store.add_memory(concept_memory);
    store.create_concept(concept_id.clone(), memory_ids, title.clone());

    let response = ConsolidationResponse {
        concept_id,
        title,
        child_count: memories.len(),
    };

    Ok(json(&ApiResponse::success(response)))
}

pub async fn get_memories(
    query: MemoryQuery,
    memory_store: Arc<RwLock<MemoryStore>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let store = memory_store.read().await;
    
    let mut memories = if let Some(modality) = query.modality {
        store.get_memories_by_modality(&modality)
    } else {
        store.get_all_memories()
    };

    // Apply time filter
    if let Some(since) = query.since {
        memories.retain(|m| m.timestamp >= since);
    }

    // Sort by timestamp (most recent first)
    memories.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    // Apply limit
    if let Some(limit) = query.limit {
        memories.truncate(limit);
    }

    let memories: Vec<&Memory> = memories.into_iter().collect();
    Ok(json(&ApiResponse::success(memories)))
}

pub async fn status(
    reflection_engine: Arc<ReflectionEngine>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let ollama_available = reflection_engine.check_ollama_health().await.unwrap_or(false);
    
    let status = serde_json::json!({
        "service": "ego-rs",
        "status": "healthy",
        "ollama": {
            "available": ollama_available,
            "url": reflection_engine.ollama_url().clone(),
            "model": reflection_engine.model().clone()
        },
        "setup_instructions": {
            "ollama_not_available": !ollama_available,
            "install_ollama": {
                "macos": "brew install ollama",
                "linux": "curl -fsSL https://ollama.ai/install.sh | sh",
                "windows": "Download from https://ollama.ai/download"
            },
            "run_ollama": "ollama serve",
            "pull_model": format!("ollama pull {}", reflection_engine.model()),
            "verify": "curl http://localhost:11434/api/tags"
        }
    });
    
    Ok(json(&status))
}
