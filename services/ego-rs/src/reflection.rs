use crate::types::{EgoThought, Memory, ThoughtMetrics};
use anyhow::Result;
use chrono::Utc;
use reqwest::Client;
use serde_json::json;
use uuid::Uuid;

#[derive(Clone)]
pub struct ReflectionEngine {
    client: Client,
    ollama_url: String,
    model: String,
}

impl ReflectionEngine {
    pub fn new(ollama_url: String, model: String) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30)) // 30 seconds timeout
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            client,
            ollama_url,
            model,
        }
    }

    pub async fn reflect_on_memories(
        &self,
        memories: &[&Memory],
        user_query: Option<&str>,
    ) -> Result<EgoThought> {
        // Use single-call approach for better performance
        self.reflect_on_memories_single_call(memories, user_query)
            .await
    }

    async fn reflect_on_memories_single_call(
        &self,
        memories: &[&Memory],
        user_query: Option<&str>,
    ) -> Result<EgoThought> {
        let prompt = self.create_single_reflection_prompt(memories, user_query);
        let response = self.call_ollama(&prompt).await?;

        let thought_data = self.parse_reflection_response(&response)?;

        Ok(EgoThought {
            id: Uuid::new_v4().to_string(),
            title: thought_data.title,
            thought: thought_data.thought,
            metrics: thought_data.metrics,
            consolidate: thought_data.consolidate,
            generated_at: Utc::now(),
            context_hash: self.generate_context_hash_from_memories(memories),
            model: self.model.clone(),
        })
    }

    fn create_single_reflection_prompt(
        &self,
        memories: &[&Memory],
        user_query: Option<&str>,
    ) -> String {
        let query_context = user_query
            .map(|q| format!("\n\nUSER QUERY: {}", q))
            .unwrap_or_default();

        // Format all memories into a single context
        let memories_text = memories
            .iter()
            .enumerate()
            .map(|(i, memory)| {
                let modality_str = match memory.modality {
                    crate::types::Modality::Vision => "vision",
                    crate::types::Modality::Speech => "speech",
                    crate::types::Modality::Text => "text",
                    crate::types::Modality::Concept => "concept",
                };

                // Extract key details from facets
                let details = match memory.modality {
                    crate::types::Modality::Vision => {
                        let object = memory
                            .facets
                            .get("vision.object")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown");
                        let color = memory
                            .facets
                            .get("color.dominant")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown");
                        format!("object: {}, color: {}", object, color)
                    }
                    crate::types::Modality::Speech => {
                        let transcript = memory
                            .facets
                            .get("speech.transcript")
                            .and_then(|v| v.as_str())
                            .unwrap_or(&memory.content);
                        let sentiment = memory
                            .facets
                            .get("speech.sentiment")
                            .and_then(|v| v.as_str())
                            .unwrap_or("neutral");
                        format!("transcript: \"{}\", sentiment: {}", transcript, sentiment)
                    }
                    _ => "processed".to_string(),
                };

                // Extract emotional context
                let valence = memory
                    .facets
                    .get("affect.valence")
                    .and_then(|v| v.as_f64())
                    .map(|v| format!("valence: {:.2}", v))
                    .unwrap_or_default();
                let arousal = memory
                    .facets
                    .get("affect.arousal")
                    .and_then(|v| v.as_f64())
                    .map(|v| format!("arousal: {:.2}", v))
                    .unwrap_or_default();

                let emotional_context = if !valence.is_empty() || !arousal.is_empty() {
                    format!(
                        " ({}{}{})",
                        valence,
                        if !valence.is_empty() && !arousal.is_empty() {
                            ", "
                        } else {
                            ""
                        },
                        arousal
                    )
                } else {
                    String::new()
                };

                format!(
                    "[{}] {}: {} | {} | ID: {}{}",
                    i + 1,
                    modality_str,
                    memory.content,
                    details,
                    memory.id,
                    emotional_context
                )
            })
            .collect::<Vec<_>>()
            .join("\n");

        format!(
            r#"You are an AI system observing and reflecting on sensory events and interactions.

Given the memories below, generate a concrete, grounded thought based on the ACTUAL events observed.

CRITICAL: Base your thought ONLY on the specific events described in the memories. Do not make up or hallucinate details that aren't mentioned.

Instructions:
1) Write a specific thought (<= 120 words) about what you actually observed
2) Reference the specific people, objects, or speech mentioned in the memories
3) If someone introduced themselves, mention their name
4) If you saw an object, describe what you actually saw (color, type, etc.)
5) If someone spoke, reference what they actually said and their intent/sentiment
6) Consider the emotional context (valence/arousal) if available
7) Connect related events (e.g., "I see a person and they introduced themselves as...")
8) Estimate metrics 0..1: self_awareness, memory_consolidation_need, emotional_stability, creative_insight
9) Suggest up to 5 memory IDs that should be consolidated (if any)
10) Provide 1 short descriptive title

Return STRICT JSON only:
{{
  "title": "string",
  "thought": "string",
  "metrics": {{
    "self_awareness": 0.0,
    "memory_consolidation_need": 0.0,
    "emotional_stability": 0.0,
    "creative_insight": 0.0
  }},
  "consolidate": ["mem-id-1", "..."]
}}

No prose outside JSON.

MEMORIES:
{}{}"#,
            memories_text, query_context
        )
    }

    pub async fn call_ollama(&self, prompt: &str) -> Result<String> {
        let request_body = json!({
            "model": self.model,
            "prompt": prompt,
            "options": {
                "temperature": 0.2,
                "top_p": 0.9,
                "repeat_penalty": 1.1
            },
            "stream": true
        });

        let response = self
            .client
            .post(&format!("{}/api/generate", self.ollama_url))
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            anyhow::bail!("Ollama API error: {}", response.status());
        }

        let text = response.text().await?;
        let lines: Vec<&str> = text.trim().split('\n').collect();

        let mut result = String::new();
        for line in lines {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                if let Some(response_text) = json.get("response").and_then(|v| v.as_str()) {
                    result.push_str(response_text);
                }
            }
        }

        Ok(result.trim().to_string())
    }

    fn parse_reflection_response(&self, response: &str) -> Result<ReflectionResponse> {
        // Extract JSON from response
        let start = response.find('{');
        let end = response.rfind('}');

        let json_str = match (start, end) {
            (Some(start), Some(end)) => &response[start..=end],
            _ => anyhow::bail!("No JSON found in response"),
        };

        let parsed: ReflectionResponse = serde_json::from_str(json_str)?;

        // Validate the response
        if parsed.title.is_empty() || parsed.thought.is_empty() {
            anyhow::bail!("Invalid reflection response: missing title or thought");
        }

        if parsed.consolidate.len() > 5 {
            anyhow::bail!("Too many consolidation suggestions");
        }

        Ok(parsed)
    }

    fn generate_context_hash_from_memories(&self, memories: &[&Memory]) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();

        // Hash memory IDs and content for consistency
        for memory in memories {
            memory.id.hash(&mut hasher);
            memory.content.hash(&mut hasher);
            // Hash modality as string since it doesn't implement Hash
            format!("{:?}", memory.modality).hash(&mut hasher);
        }

        self.model.hash(&mut hasher);
        memories.len().hash(&mut hasher);

        format!("{:x}", hasher.finish())
    }

    pub async fn check_ollama_health(&self) -> Result<bool> {
        let response = self
            .client
            .get(&format!("{}/api/tags", self.ollama_url))
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await;

        match response {
            Ok(resp) => Ok(resp.status().is_success()),
            Err(_) => Ok(false),
        }
    }

    pub fn ollama_url(&self) -> &String {
        &self.ollama_url
    }

    pub fn model(&self) -> &String {
        &self.model
    }
}

#[derive(Debug, Clone, serde::Deserialize)]
struct ReflectionResponse {
    title: String,
    thought: String,
    metrics: ThoughtMetrics,
    consolidate: Vec<String>,
}
