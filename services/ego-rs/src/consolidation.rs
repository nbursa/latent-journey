use crate::reflection::ReflectionEngine;
use crate::types::{ConsolidationRequest, ConsolidationResult, Experience, Memory};
use chrono::Utc;
use std::collections::HashMap;
use uuid::Uuid;

pub struct ConsolidationEngine {
    min_thoughts_for_consolidation: usize,
    consolidation_threshold: f32,
    reflection_engine: Option<ReflectionEngine>,
}

impl ConsolidationEngine {
    pub fn new() -> Self {
        Self {
            min_thoughts_for_consolidation: 3,
            consolidation_threshold: 0.6,
            reflection_engine: None,
        }
    }

    pub fn new_with_llm(reflection_engine: ReflectionEngine) -> Self {
        Self {
            min_thoughts_for_consolidation: 3,
            consolidation_threshold: 0.6,
            reflection_engine: Some(reflection_engine),
        }
    }

    pub fn should_consolidate(&self, memories: &[Memory]) -> bool {
        if memories.len() < self.min_thoughts_for_consolidation {
            return false;
        }

        // Check if average consolidation need is above threshold
        let avg_consolidation_need: f32 = memories
            .iter()
            .filter_map(|m| {
                m.facets
                    .get("memory_consolidation_need")
                    .and_then(|v| v.as_f64())
                    .map(|v| v as f32)
            })
            .sum::<f32>()
            / memories.len() as f32;

        avg_consolidation_need >= self.consolidation_threshold
    }

    pub fn group_related_thoughts<'a>(&self, memories: &'a [Memory]) -> Vec<Vec<&'a Memory>> {
        let mut groups: Vec<Vec<&'a Memory>> = Vec::new();
        let mut used_indices = std::collections::HashSet::new();

        for (i, memory) in memories.iter().enumerate() {
            if used_indices.contains(&i) {
                continue;
            }

            let mut group = vec![memory];
            used_indices.insert(i);

            // Find related thoughts based on content similarity and themes
            for (j, other_memory) in memories.iter().enumerate() {
                if used_indices.contains(&j) || i == j {
                    continue;
                }

                if self.are_thoughts_related(memory, other_memory) {
                    group.push(other_memory);
                    used_indices.insert(j);
                }
            }

            if group.len() >= 2 {
                groups.push(group);
            }
        }

        groups
    }

    fn are_thoughts_related(&self, thought1: &Memory, thought2: &Memory) -> bool {
        // Check temporal proximity (within 1 hour)
        let time_diff = (thought1.timestamp.timestamp() - thought2.timestamp.timestamp()).abs();
        if time_diff > 3600 {
            return false;
        }

        // Check content similarity (simple keyword overlap)
        let content1 = thought1.content.to_lowercase();
        let content2 = thought2.content.to_lowercase();

        let words1: std::collections::HashSet<&str> = content1.split_whitespace().collect();
        let words2: std::collections::HashSet<&str> = content2.split_whitespace().collect();

        let intersection = words1.intersection(&words2).count();
        let union = words1.union(&words2).count();

        let similarity = intersection as f32 / union as f32;
        similarity > 0.3
    }

    pub async fn create_experience_from_thoughts(
        &self,
        thoughts: &[&Memory],
        llm_prompt: &str,
    ) -> Result<Experience, String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        // Extract themes from thought content using LLM if available
        let themes = if self.reflection_engine.is_some() {
            self.extract_themes_with_llm(thoughts)
                .await
                .unwrap_or_else(|_| self.extract_themes(thoughts))
        } else {
            self.extract_themes(thoughts)
        };

        // Calculate emotional tone from thought metrics
        let emotional_tone = self.calculate_emotional_tone(thoughts);

        // Calculate importance based on consolidation need
        let importance = self.calculate_importance(thoughts);

        // Generate title and summary using LLM if available
        let title = if self.reflection_engine.is_some() {
            self.generate_title_with_llm(thoughts)
                .await
                .unwrap_or_else(|_| self.generate_title(thoughts))
        } else {
            self.generate_title(thoughts)
        };

        let summary = if self.reflection_engine.is_some() {
            self.generate_summary_with_llm(thoughts, llm_prompt)
                .await
                .unwrap_or_else(|_| self.generate_summary(thoughts, llm_prompt))
        } else {
            self.generate_summary(thoughts, llm_prompt)
        };

        // Create context hash from all thought IDs
        let context_hash = self.create_context_hash(thoughts);

        // Get consolidated thought IDs
        let consolidated_from: Vec<String> = thoughts.iter().map(|t| t.id.clone()).collect();

        Ok(Experience {
            id,
            title,
            summary,
            consolidated_from,
            created_at: thoughts.iter().map(|t| t.timestamp).min().unwrap_or(now),
            consolidated_at: now,
            themes,
            emotional_tone,
            importance,
            context_hash,
            tags: vec!["consolidated".to_string(), "experience".to_string()],
        })
    }

    fn extract_themes(&self, thoughts: &[&Memory]) -> Vec<String> {
        let mut theme_counts: HashMap<String, usize> = HashMap::new();

        for thought in thoughts {
            // Extract potential themes from content
            let content = thought.content.to_lowercase();

            // Simple theme extraction based on keywords
            let theme_keywords = [
                (
                    "conversation",
                    vec!["talk", "speak", "discuss", "conversation", "chat"],
                ),
                (
                    "introduction",
                    vec!["introduce", "name", "hello", "meet", "greet"],
                ),
                (
                    "sustainability",
                    vec![
                        "climate",
                        "sustainability",
                        "environment",
                        "green",
                        "renewable",
                    ],
                ),
                (
                    "research",
                    vec!["research", "study", "investigate", "analyze", "data"],
                ),
                (
                    "festival",
                    vec!["festival", "event", "celebration", "dance", "performance"],
                ),
                (
                    "food",
                    vec!["food", "eat", "drink", "coffee", "tea", "meal"],
                ),
                (
                    "clothing",
                    vec!["clothes", "shirt", "dress", "wear", "fashion"],
                ),
            ];

            for (theme, keywords) in &theme_keywords {
                if keywords.iter().any(|keyword| content.contains(keyword)) {
                    *theme_counts.entry(theme.to_string()).or_insert(0) += 1;
                }
            }
        }

        // Return themes that appear in at least 2 thoughts
        theme_counts
            .into_iter()
            .filter(|(_, count)| *count >= 2)
            .map(|(theme, _)| theme)
            .collect()
    }

    fn calculate_emotional_tone(&self, thoughts: &[&Memory]) -> f32 {
        let mut total_valence = 0.0;
        let mut count = 0;

        for thought in thoughts {
            if let Some(valence) = thought
                .facets
                .get("affect.valence")
                .and_then(|v| v.as_f64())
            {
                total_valence += valence as f32;
                count += 1;
            }
        }

        if count > 0 {
            total_valence / count as f32
        } else {
            0.5
        }
    }

    fn calculate_importance(&self, thoughts: &[&Memory]) -> f32 {
        let mut total_importance = 0.0;
        let mut count = 0;

        for thought in thoughts {
            if let Some(consolidation_need) = thought
                .facets
                .get("memory_consolidation_need")
                .and_then(|v| v.as_f64())
            {
                total_importance += consolidation_need as f32;
                count += 1;
            }
        }

        if count > 0 {
            total_importance / count as f32
        } else {
            0.5
        }
    }

    fn generate_title(&self, thoughts: &[&Memory]) -> String {
        // Simple title generation based on themes and content
        let themes = self.extract_themes(thoughts);

        if !themes.is_empty() {
            format!("Experience: {}", themes.join(", "))
        } else {
            "Consolidated Experience".to_string()
        }
    }

    fn generate_summary(&self, thoughts: &[&Memory], _llm_prompt: &str) -> String {
        let mut summaries: Vec<String> = Vec::new();

        for thought in thoughts {
            let content = &thought.content;
            if content.len() > 100 {
                summaries.push(format!("{}...", &content[..97]));
            } else {
                summaries.push(content.clone());
            }
        }

        if summaries.len() <= 3 {
            summaries.join(" | ")
        } else {
            format!(
                "{} | ... and {} more thoughts",
                summaries[..3].join(" | "),
                summaries.len() - 3
            )
        }
    }

    fn create_context_hash(&self, thoughts: &[&Memory]) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        for thought in thoughts {
            thought.id.hash(&mut hasher);
        }
        format!("{:x}", hasher.finish())
    }

    pub async fn consolidate_thoughts(
        &self,
        memories: &[Memory],
        request: &ConsolidationRequest,
    ) -> Result<ConsolidationResult, String> {
        let force = request.force.unwrap_or(false);
        let max_experiences = request.max_experiences.unwrap_or(5);

        if !force && !self.should_consolidate(memories) {
            return Ok(ConsolidationResult {
                experiences_created: 0,
                thoughts_consolidated: 0,
                consolidation_time: Utc::now(),
                themes_identified: vec![],
            });
        }

        let groups = self.group_related_thoughts(memories);
        let mut experiences_created = 0;
        let mut thoughts_consolidated = 0;
        let mut all_themes = Vec::new();

        for group in groups.iter().take(max_experiences) {
            if group.len() < 2 {
                continue;
            }

            // Create experience from group
            let experience = self
                .create_experience_from_thoughts(
                    group,
                    "Summarize these related thoughts into a coherent experience.",
                )
                .await?;

            all_themes.extend(experience.themes.clone());
            experiences_created += 1;
            thoughts_consolidated += group.len();
        }

        Ok(ConsolidationResult {
            experiences_created,
            thoughts_consolidated,
            consolidation_time: Utc::now(),
            themes_identified: all_themes,
        })
    }

    async fn extract_themes_with_llm(&self, thoughts: &[&Memory]) -> Result<Vec<String>, String> {
        if let Some(reflection_engine) = &self.reflection_engine {
            let content = thoughts
                .iter()
                .map(|t| t.content.as_str())
                .collect::<Vec<_>>()
                .join(" ");

            let prompt = format!(
                "Analyze the following thoughts and extract 3-5 key themes that represent the main topics or concepts discussed. Return only a comma-separated list of theme names, no explanations:\n\n{}",
                content
            );

            match reflection_engine.call_ollama(&prompt).await {
                Ok(response) => {
                    let themes: Vec<String> = response
                        .split(',')
                        .map(|s| s.trim().to_lowercase())
                        .filter(|s| !s.is_empty())
                        .collect();
                    Ok(themes)
                }
                Err(e) => Err(format!("LLM theme extraction failed: {}", e)),
            }
        } else {
            Err("No reflection engine available".to_string())
        }
    }

    async fn generate_title_with_llm(&self, thoughts: &[&Memory]) -> Result<String, String> {
        if let Some(reflection_engine) = &self.reflection_engine {
            let content = thoughts
                .iter()
                .map(|t| t.content.as_str())
                .collect::<Vec<_>>()
                .join(" ");

            let prompt = format!(
                "Based on the following thoughts, generate a concise, meaningful title (3-8 words) that captures the essence of this experience. Return only the title, no explanations:\n\n{}",
                content
            );

            match reflection_engine.call_ollama(&prompt).await {
                Ok(response) => Ok(response.trim().to_string()),
                Err(e) => Err(format!("LLM title generation failed: {}", e)),
            }
        } else {
            Err("No reflection engine available".to_string())
        }
    }

    async fn generate_summary_with_llm(
        &self,
        thoughts: &[&Memory],
        _llm_prompt: &str,
    ) -> Result<String, String> {
        if let Some(reflection_engine) = &self.reflection_engine {
            let content = thoughts
                .iter()
                .map(|t| t.content.as_str())
                .collect::<Vec<_>>()
                .join(" ");

            let prompt = format!(
                "Consolidate the following related thoughts into a coherent, meaningful summary that tells a story about this experience. Focus on the key insights and connections between the thoughts. Keep it concise but comprehensive (2-3 sentences):\n\n{}",
                content
            );

            match reflection_engine.call_ollama(&prompt).await {
                Ok(response) => Ok(response.trim().to_string()),
                Err(e) => Err(format!("LLM summary generation failed: {}", e)),
            }
        } else {
            Err("No reflection engine available".to_string())
        }
    }
}

impl Default for ConsolidationEngine {
    fn default() -> Self {
        Self::new()
    }
}
