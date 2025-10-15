use crate::{
    consolidation::ConsolidationEngine,
    memory::MemoryStore,
    reflection::ReflectionEngine,
    types::{
        ApiResponse, ConsolidationRequest, ConsolidationResult, EgoThought, Experience, Memory,
        MemoryQuery,
    },
    Modality,
};
use anyhow::Result;
use chrono::Utc;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use warp::reply::json;

fn generate_fallback_thought(memories: &[&Memory], user_query: Option<&str>) -> EgoThought {
    let mut vision_count = 0;
    let mut speech_count = 0;
    let mut text_count = 0;
    let mut recent_events = Vec::new();

    for memory in memories.iter().take(5) {
        match memory.modality {
            crate::types::Modality::Vision => vision_count += 1,
            crate::types::Modality::Speech => speech_count += 1,
            crate::types::Modality::Text => text_count += 1,
            crate::types::Modality::Concept => text_count += 1,
        }

        if !memory.content.is_empty() {
            recent_events.push(format!(
                "[{}] {}",
                match memory.modality {
                    crate::types::Modality::Vision => "vision",
                    crate::types::Modality::Speech => "speech",
                    crate::types::Modality::Text => "text",
                    crate::types::Modality::Concept => "concept",
                },
                memory.content
            ));
        }
    }

    let thought_content = if let Some(query) = user_query {
        format!("Processing query: '{}'. Recent events: {}. I observe {} vision, {} speech, and {} text events.", 
            query,
            recent_events.join("; "),
            vision_count, speech_count, text_count
        )
    } else {
        if !recent_events.is_empty() {
            // Generate more intelligent fallback thoughts based on actual content
            let mut intelligent_thought = String::new();

            // Analyze vision events
            let vision_events: Vec<&String> = recent_events
                .iter()
                .filter(|event| event.contains("[vision]"))
                .collect();
            if !vision_events.is_empty() {
                intelligent_thought.push_str("I can see ");
                let vision_descriptions: Vec<String> = vision_events
                    .iter()
                    .map(|event| {
                        if event.contains("person with glasses") {
                            "a person wearing glasses".to_string()
                        } else if event.contains("person") {
                            "a person".to_string()
                        } else if event.contains("object") {
                            "an object".to_string()
                        } else {
                            "something".to_string()
                        }
                    })
                    .collect();
                intelligent_thought.push_str(&vision_descriptions.join(" and "));
                intelligent_thought.push_str(". ");
            }

            // Analyze speech events
            let speech_events: Vec<&String> = recent_events
                .iter()
                .filter(|event| event.contains("[speech]"))
                .collect();
            if !speech_events.is_empty() {
                intelligent_thought.push_str("I heard ");
                let speech_descriptions: Vec<String> = speech_events
                    .iter()
                    .map(|event| {
                        if event.contains("Hello Agent") || event.contains("Hello agent") {
                            "a greeting asking how I am".to_string()
                        } else if event.contains("you") {
                            "someone referring to me".to_string()
                        } else {
                            "speech".to_string()
                        }
                    })
                    .collect();
                intelligent_thought.push_str(&speech_descriptions.join(" and "));
                intelligent_thought.push_str(". ");
            }

            // Add contextual reflection with curiosity
            if vision_count > 0 && speech_count > 0 {
                intelligent_thought.push_str("I wonder what this person wants to talk about. They seem friendly, but I'm curious about their intentions.");
            } else if vision_count > 0 {
                intelligent_thought
                    .push_str("I'm observing my environment, but I'm not sure what to make of what I'm seeing yet.");
            } else if speech_count > 0 {
                intelligent_thought
                    .push_str("I'm hearing someone speak, but I'm curious about what they're trying to tell me.");
            }

            if intelligent_thought.is_empty() {
                format!("I observed: {}. This gives me {} vision, {} speech, and {} text memories to process.", 
                    recent_events.join("; "),
                    vision_count, speech_count, text_count
                )
            } else {
                intelligent_thought
            }
        } else {
            format!("I have {} vision, {} speech, and {} text memories, but no specific content to reflect on.", 
                vision_count, speech_count, text_count
            )
        }
    };

    let total_memories = memories.len();

    // More intelligent metrics calculation based on content analysis
    let self_awareness = if vision_count > 0 && speech_count > 0 {
        0.8 // High self-awareness when processing multiple modalities
    } else if total_memories > 0 {
        0.6 // Medium self-awareness with some memories
    } else {
        0.3 // Low self-awareness with no memories
    };

    let memory_consolidation_need = if total_memories > 3 {
        0.7 // High consolidation need with many memories
    } else if total_memories > 1 {
        0.5 // Medium consolidation need
    } else {
        0.3 // Low consolidation need
    };

    let emotional_stability = if recent_events.iter().any(|event| event.contains("neutral")) {
        0.7 // Stable when detecting neutral emotions
    } else {
        0.5 // Neutral stability
    };

    let creative_insight = if vision_count > 0 && speech_count > 0 {
        0.7 // High creativity when connecting vision and speech
    } else if total_memories > 1 {
        0.5 // Medium creativity with multiple memories
    } else {
        0.3 // Low creativity with single memory
    };

    EgoThought {
        id: Uuid::new_v4().to_string(),
        title: "Fallback Reflection".to_string(),
        thought: thought_content,
        metrics: crate::types::ThoughtMetrics {
            self_awareness,
            memory_consolidation_need,
            emotional_stability,
            creative_insight,
        },
        consolidate: if total_memories > 2 {
            memories.iter().take(3).map(|m| m.id.clone()).collect()
        } else {
            Vec::new()
        },
        generated_at: Utc::now(),
        context_hash: format!("fallback_{}", total_memories),
        model: "fallback".to_string(),
    }
}

pub async fn reflect(
    request: crate::types::ReflectionRequest,
    memory_store: Arc<RwLock<MemoryStore>>,
    reflection_engine: Arc<ReflectionEngine>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // Get existing thoughts from store (release read lock immediately)
    // Get all memories to track which events have been processed
    let all_memories: Vec<Memory> = {
        let store = memory_store.read().await;
        store.get_all_memories().into_iter().cloned().collect()
    };

    // Extract processed event IDs from existing thoughts (Text memories)
    // Only consider thoughts that have processed_events facet (new format)
    let processed_event_ids: std::collections::HashSet<String> = all_memories
        .iter()
        .filter(|memory| matches!(memory.modality, Modality::Text))
        .filter_map(|memory| {
            // Only extract if processed_events facet exists
            memory
                .facets
                .get("processed_events")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str())
                        .map(|s| s.to_string())
                        .collect::<Vec<String>>()
                })
        })
        .flatten()
        .collect();

    // Filter to only include unprocessed raw events (Vision/Speech)
    let unprocessed_events: Vec<&Memory> = all_memories
        .iter()
        .filter(|memory| matches!(memory.modality, Modality::Vision | Modality::Speech))
        .filter(|memory| !processed_event_ids.contains(&memory.id))
        .collect();

    // Add incoming context memories (these are always new unprocessed events)
    let mut memories_for_reflection = unprocessed_events;
    memories_for_reflection.extend(request.memories.iter().map(|m| m as &Memory));

    // Sort by recency and limit to most recent unprocessed events only
    memories_for_reflection.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    memories_for_reflection.truncate(5);

    let memories_to_use = &memories_for_reflection;

    // Debug: Log what memories are being sent to the LLM
    tracing::info!(
        "Sending {} memories to reflection engine:",
        memories_to_use.len()
    );
    for (i, memory) in memories_to_use.iter().enumerate() {
        tracing::info!(
            "Memory {}: modality={:?}, content='{}', facets={:?}",
            i,
            memory.modality,
            memory.content,
            memory.facets
        );
    }

    // Generate reflection
    let thought = match reflection_engine
        .reflect_on_memories(memories_to_use, request.user_query.as_deref())
        .await
    {
        Ok(thought) => {
            tracing::info!("Successfully generated thought via Ollama");
            thought
        }
        Err(e) => {
            tracing::warn!(
                "Reflection engine failed, generating fallback thought: {}",
                e
            );
            // Generate a simple fallback thought based on the memories
            tracing::info!(
                "Generating fallback thought with {} memories",
                memories_to_use.len()
            );
            generate_fallback_thought(memories_to_use, request.user_query.as_deref())
        }
    };

    // Convert EgoThought to Memory and save to store
    tracing::info!("Converting thought to memory and saving...");

    let memory = match std::panic::catch_unwind(|| {
        Memory {
            id: thought.id.clone(),
            timestamp: Utc::now(), // Use current time for simplicity
            modality: crate::types::Modality::Text,
            embedding: vec![], // Thoughts don't have embeddings in this context
            content: thought.thought.clone(),
            facets: {
                let mut facets = std::collections::HashMap::new();
                facets.insert(
                    "self_awareness".to_string(),
                    serde_json::Value::Number(
                        serde_json::Number::from_f64(thought.metrics.self_awareness as f64)
                            .unwrap_or(serde_json::Number::from(0)),
                    ),
                );
                facets.insert(
                    "memory_consolidation_need".to_string(),
                    serde_json::Value::Number(
                        serde_json::Number::from_f64(
                            thought.metrics.memory_consolidation_need as f64,
                        )
                        .unwrap_or(serde_json::Number::from(0)),
                    ),
                );
                facets.insert(
                    "emotional_stability".to_string(),
                    serde_json::Value::Number(
                        serde_json::Number::from_f64(thought.metrics.emotional_stability as f64)
                            .unwrap_or(serde_json::Number::from(0)),
                    ),
                );
                facets.insert(
                    "creative_insight".to_string(),
                    serde_json::Value::Number(
                        serde_json::Number::from_f64(thought.metrics.creative_insight as f64)
                            .unwrap_or(serde_json::Number::from(0)),
                    ),
                );
                facets.insert(
                    "context_hash".to_string(),
                    serde_json::Value::String(thought.context_hash.clone()),
                );

                // Track which events were processed in this thought
                let processed_event_ids: Vec<serde_json::Value> = memories_to_use
                    .iter()
                    .map(|memory| serde_json::Value::String(memory.id.clone()))
                    .collect();
                facets.insert(
                    "processed_events".to_string(),
                    serde_json::Value::Array(processed_event_ids),
                );

                facets
            },
            tags: vec!["thought".to_string(), "ego".to_string()],
        }
    }) {
        Ok(memory) => memory,
        Err(_) => {
            tracing::error!("Panic during memory conversion");
            return Ok(json(&ApiResponse::<EgoThought>::error(
                "Memory conversion failed".to_string(),
            )));
        }
    };

    // Save the thought to the store
    tracing::info!("Acquiring write lock for memory store...");
    let mut store = memory_store.write().await;
    tracing::info!("Write lock acquired, attempting to save memory...");

    // Try to add memory first
    store.add_memory(memory.clone());
    tracing::info!("Memory added to store, attempting to save to file...");

    if let Err(e) = store.save_all_memories() {
        tracing::error!("Failed to save thought to file: {}", e);
    } else {
        tracing::info!("Successfully saved thought to file");
    }

    tracing::info!("Memory store operation completed");

    tracing::info!("Returning successful response");
    Ok(json(&ApiResponse::success(thought)))
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

pub async fn clear_data(
    memory_store: Arc<RwLock<MemoryStore>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    tracing::info!("Clearing all ego data (STM and LTM)...");

    let mut store = memory_store.write().await;

    // Clear all memories from STM
    store.clear_all_memories();

    // Clear all experiences from LTM
    store.clear_all_experiences();

    // Save the empty store to files
    if let Err(e) = store.save_all_memories() {
        tracing::error!("Failed to save empty STM store: {}", e);
        return Ok(json(&ApiResponse::<()>::error(
            "Failed to clear STM data".to_string(),
        )));
    }

    if let Err(e) = store.save_ltm_to_jsonl() {
        tracing::error!("Failed to save empty LTM store: {}", e);
        return Ok(json(&ApiResponse::<()>::error(
            "Failed to clear LTM data".to_string(),
        )));
    }

    tracing::info!("Successfully cleared all ego data (STM and LTM)");
    Ok(json(&ApiResponse::success(())))
}

pub async fn status(
    reflection_engine: Arc<ReflectionEngine>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let ollama_available = reflection_engine
        .check_ollama_health()
        .await
        .unwrap_or(false);

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

pub async fn consolidate_stm_to_ltm(
    memory_store: Arc<RwLock<MemoryStore>>,
    reflection_engine: Arc<ReflectionEngine>,
    request: ConsolidationRequest,
) -> Result<impl warp::Reply, warp::Rejection> {
    tracing::info!("Starting STM to LTM consolidation...");

    let consolidation_engine = ConsolidationEngine::new_with_llm((*reflection_engine).clone());

    // Get all memories and experiences from STM
    let (all_memories, existing_experiences) = {
        let store = memory_store.read().await;
        (
            store
                .get_all_memories()
                .into_iter()
                .cloned()
                .collect::<Vec<Memory>>(),
            store
                .get_experiences()
                .into_iter()
                .cloned()
                .collect::<Vec<crate::types::Experience>>(),
        )
    };

    // Extract IDs of thoughts that have already been consolidated
    let consolidated_thought_ids: std::collections::HashSet<String> = existing_experiences
        .iter()
        .flat_map(|exp| exp.consolidated_from.clone())
        .collect();

    // Filter out already-consolidated thoughts
    let memories: Vec<Memory> = all_memories
        .into_iter()
        .filter(|memory| !consolidated_thought_ids.contains(&memory.id))
        .collect();

    if memories.is_empty() {
        return Ok(json(&ApiResponse::<ConsolidationResult>::success(
            ConsolidationResult {
                experiences_created: 0,
                thoughts_consolidated: 0,
                consolidation_time: Utc::now(),
                themes_identified: vec![],
            },
        )));
    }

    // Perform consolidation
    let result = match consolidation_engine
        .consolidate_thoughts(&memories, &request)
        .await
    {
        Ok(result) => result,
        Err(e) => {
            tracing::error!("Consolidation failed: {}", e);
            return Ok(json(&ApiResponse::<ConsolidationResult>::error(format!(
                "Consolidation failed: {}",
                e
            ))));
        }
    };

    if result.experiences_created > 0 {
        // Create experiences and add them to LTM
        let groups = consolidation_engine.group_related_thoughts(&memories);
        let mut experiences_added = 0;

        for group in groups.iter().take(result.experiences_created) {
            if group.len() < 2 {
                continue;
            }

            match consolidation_engine
                .create_experience_from_thoughts(
                    group,
                    "Summarize these related thoughts into a coherent experience.",
                )
                .await
            {
                Ok(experience) => {
                    let mut store = memory_store.write().await;
                    store.add_experience(experience);
                    experiences_added += 1;
                }
                Err(e) => {
                    tracing::error!("Failed to create experience: {}", e);
                }
            }
        }

        // Save LTM to file
        {
            let store = memory_store.read().await;
            if let Err(e) = store.save_ltm_to_jsonl() {
                tracing::error!("Failed to save LTM: {}", e);
            }
        }

        tracing::info!(
            "Consolidation completed: {} experiences created, {} thoughts consolidated",
            experiences_added,
            result.thoughts_consolidated
        );
    }

    Ok(json(&ApiResponse::success(result)))
}

pub async fn get_ltm_experiences(
    memory_store: Arc<RwLock<MemoryStore>>,
    query: MemoryQuery,
) -> Result<impl warp::Reply, warp::Rejection> {
    tracing::info!("Retrieving LTM experiences...");

    let store = memory_store.read().await;
    let mut experiences = store.get_experiences();

    // Apply limit if specified
    if let Some(limit) = query.limit {
        experiences.truncate(limit);
    }

    // Sort by creation time (newest first)
    experiences.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    tracing::info!("Retrieved {} experiences from LTM", experiences.len());
    Ok(json(&ApiResponse::success(experiences)))
}

pub async fn get_ltm_experience(
    id: String,
    memory_store: Arc<RwLock<MemoryStore>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    tracing::info!("Retrieving LTM experience: {}", id);

    let store = memory_store.read().await;

    match store.get_experience(&id) {
        Some(experience) => {
            tracing::info!("Found experience: {}", experience.title);
            Ok(json(&ApiResponse::success(experience)))
        }
        None => {
            tracing::warn!("Experience not found: {}", id);
            Ok(json(&ApiResponse::<&Experience>::error(
                "Experience not found".to_string(),
            )))
        }
    }
}

pub async fn clear_ltm_data(
    memory_store: Arc<RwLock<MemoryStore>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    tracing::info!("Clearing all LTM data...");

    let mut store = memory_store.write().await;

    // Clear all experiences from the store
    store.clear_all_experiences();

    // Save the empty store to file
    if let Err(e) = store.save_ltm_to_jsonl() {
        tracing::error!("Failed to save empty LTM store: {}", e);
        return Ok(json(&ApiResponse::<()>::error(
            "Failed to clear LTM data".to_string(),
        )));
    }

    tracing::info!("Successfully cleared all LTM data");
    Ok(json(&ApiResponse::success(())))
}
