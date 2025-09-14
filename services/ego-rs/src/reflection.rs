use crate::types::{EgoThought, Memory, ThoughtMetrics};
use anyhow::Result;
use chrono::Utc;
use reqwest::Client;
use serde_json::json;
use uuid::Uuid;

pub struct ReflectionEngine {
    client: Client,
    ollama_url: String,
    model: String,
}

impl ReflectionEngine {
    pub fn new(ollama_url: String, model: String) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(120)) // 120 seconds timeout
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
        // Step 1: Map memories to notes
        let notes = self.map_memories_to_notes(memories).await?;
        
        // Step 2: Reduce notes to context
        let context = self.reduce_notes_to_context(&notes).await?;
        
        // Step 3: Generate reflection
        let thought = self.generate_reflection(&context, user_query).await?;
        
        Ok(thought)
    }

    async fn map_memories_to_notes(&self, memories: &[&Memory]) -> Result<Vec<MemoryNote>> {
        let mut notes = Vec::new();
        
        for memory in memories {
            let prompt = self.create_map_prompt(memory);
            let response = self.call_ollama(&prompt).await?;
            
            if let Some(note) = self.parse_memory_note(&response, &memory.id) {
                notes.push(note);
            }
        }
        
        Ok(notes)
    }

    async fn reduce_notes_to_context(&self, notes: &[MemoryNote]) -> Result<ContextSummary> {
        let prompt = self.create_reduce_prompt(notes);
        let response = self.call_ollama(&prompt).await?;
        
        Ok(self.parse_context_summary(&response, notes.len()))
    }

    async fn generate_reflection(
        &self,
        context: &ContextSummary,
        user_query: Option<&str>,
    ) -> Result<EgoThought> {
        let prompt = self.create_reflection_prompt(context, user_query);
        let response = self.call_ollama(&prompt).await?;
        
        let thought_data = self.parse_reflection_response(&response)?;
        
        Ok(EgoThought {
            id: Uuid::new_v4().to_string(),
            title: thought_data.title,
            thought: thought_data.thought,
            metrics: thought_data.metrics,
            consolidate: thought_data.consolidate,
            generated_at: Utc::now(),
            context_hash: self.generate_context_hash(context),
            model: self.model.clone(),
        })
    }

    fn create_map_prompt(&self, memory: &Memory) -> String {
        let modality_str = match memory.modality {
            crate::types::Modality::Vision => "vision",
            crate::types::Modality::Speech => "speech",
            crate::types::Modality::Text => "text",
            crate::types::Modality::Concept => "concept",
        };

        format!(
            r#"You compress one memory into a single line.
Constraints:
- 18 words max.
- Include modality [vision|speech|text|concept].
- Zero speculation. Only what is present.

Return exactly:
<note>[modality] key facts... | tags: tag1, tag2</note>

MEMORY:
{{
  "id": "{}",
  "modality": "{}",
  "timestamp": "{}",
  "content": "{}",
  "facets": {}
}}"#,
            memory.id,
            modality_str,
            memory.timestamp.to_rfc3339(),
            memory.content,
            serde_json::to_string_pretty(&memory.facets).unwrap_or_default()
        )
    }

    fn create_reduce_prompt(&self, notes: &[MemoryNote]) -> String {
        let notes_text = notes
            .iter()
            .map(|note| {
                format!(
                    "<note>[{}] {} | tags: {}</note>",
                    match note.modality {
                        crate::types::Modality::Vision => "vision",
                        crate::types::Modality::Speech => "speech",
                        crate::types::Modality::Text => "text",
                        crate::types::Modality::Concept => "concept",
                    },
                    note.content,
                    note.tags.join(", ")
                )
            })
            .collect::<Vec<_>>()
            .join("\n");

        format!(
            r#"You merge short memory notes into a compact context (<= 120 words).
- Preserve chronology.
- Group by motif (e.g., "agent", "object on desk").
- Output 3 bullet points, no extra text.

NOTES:
{}"#,
            notes_text
        )
    }

    fn create_reflection_prompt(&self, context: &ContextSummary, user_query: Option<&str>) -> String {
        let query_context = user_query
            .map(|q| format!("\n\nUSER QUERY: {}", q))
            .unwrap_or_default();

        format!(
            r#"You are "Ego", a reflective process that infers internal state from structured memory.

Given:
- CONTEXT (120 words max)
- GOAL: emergence of consciousness through structured memory

Until:
1) Produce a concise self-reflective "thought" (<= 120 words), grounded only in the context.
2) Estimate metrics 0..1: self_awareness, memory_consolidation_need, emotional_stability, creative_insight.
3) Suggest up to 5 memory IDs that should be consolidated into a higher-level concept (if any).
4) Provide 1 short title.

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

CONTEXT:
{}{}"#,
            context.summary, query_context
        )
    }

    async fn call_ollama(&self, prompt: &str) -> Result<String> {
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

    fn parse_memory_note(&self, response: &str, memory_id: &str) -> Option<MemoryNote> {
        let regex = regex::Regex::new(r"<note>\[([^\]]+)\]\s*(.+?)\s*\|\s*tags:\s*(.+?)</note>").ok()?;
        let captures = regex.captures(response)?;
        
        let modality = match captures.get(1)?.as_str() {
            "vision" => crate::types::Modality::Vision,
            "speech" => crate::types::Modality::Speech,
            "text" => crate::types::Modality::Text,
            "concept" => crate::types::Modality::Concept,
            _ => return None,
        };

        let content = captures.get(2)?.as_str().trim().to_string();
        let tags: Vec<String> = captures
            .get(3)?
            .as_str()
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        Some(MemoryNote {
            modality,
            content,
            tags,
            _memory_id: memory_id.to_string(),
        })
    }

    fn parse_context_summary(&self, response: &str, memory_count: usize) -> ContextSummary {
        let bullet_points: Vec<String> = response
            .lines()
            .filter(|line| line.trim().starts_with('•') || line.trim().starts_with('-'))
            .map(|line| line.replace(['•', '-'], "").trim().to_string())
            .filter(|line| !line.is_empty())
            .collect();

        ContextSummary {
            summary: bullet_points.join(" "),
            memory_count,
            _time_window: 20,
        }
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

    fn generate_context_hash(&self, context: &ContextSummary) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        context.summary.hash(&mut hasher);
        context.memory_count.hash(&mut hasher);
        self.model.hash(&mut hasher);
        
        format!("{:x}", hasher.finish())
    }

    pub async fn check_ollama_health(&self) -> Result<bool> {
        let response = self.client
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

#[derive(Debug, Clone)]
struct MemoryNote {
    modality: crate::types::Modality,
    content: String,
    tags: Vec<String>,
    _memory_id: String,
}

#[derive(Debug, Clone)]
struct ContextSummary {
    summary: String,
    memory_count: usize,
    _time_window: u64,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct ReflectionResponse {
    title: String,
    thought: String,
    metrics: ThoughtMetrics,
    consolidate: Vec<String>,
}
