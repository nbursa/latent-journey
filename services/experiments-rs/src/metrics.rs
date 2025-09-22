// use crate::types::{AgentRunResult, AgentMetrics};
use anyhow::Result;
use std::collections::HashMap;

pub struct StatisticalAnalyzer;

impl StatisticalAnalyzer {
    pub fn calculate_entropy(values: &[f32]) -> f32 {
        if values.is_empty() {
            return 0.0;
        }

        let mut counts = HashMap::new();
        for &value in values {
            let bucket = (value * 10.0).round() as i32;
            *counts.entry(bucket).or_insert(0) += 1;
        }

        let total = values.len() as f32;
        let mut entropy = 0.0;

        for count in counts.values() {
            let probability = *count as f32 / total;
            if probability > 0.0 {
                entropy -= probability * probability.log2();
            }
        }

        entropy
    }

    pub fn calculate_cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
        if a.len() != b.len() || a.is_empty() {
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

    pub fn calculate_self_model_divergence(
        baseline_embedding: &[f32],
        current_embedding: &[f32],
    ) -> f32 {
        1.0 - Self::calculate_cosine_similarity(baseline_embedding, current_embedding)
    }

    pub fn calculate_trauma_score(
        valence: f32,
        salience: f32,
        reflection_freq: f32,
        temporal_weight: f32,
    ) -> f32 {
        if valence < 0.0 {
            valence.abs() * salience * reflection_freq * temporal_weight
        } else {
            0.0
        }
    }

    pub fn calculate_confidence_std(confidences: &[f32]) -> f32 {
        if confidences.is_empty() {
            return 0.0;
        }

        let mean = confidences.iter().sum::<f32>() / confidences.len() as f32;
        let variance =
            confidences.iter().map(|x| (x - mean).powi(2)).sum::<f32>() / confidences.len() as f32;

        variance.sqrt()
    }

    pub fn calculate_coherence(reflections: &[String]) -> f32 {
        if reflections.len() < 2 {
            return 1.0;
        }

        let mut similarities = Vec::new();
        for i in 0..reflections.len() - 1 {
            let similarity = Self::calculate_text_similarity(&reflections[i], &reflections[i + 1]);
            similarities.push(similarity);
        }

        similarities.iter().sum::<f32>() / similarities.len() as f32
    }

    fn calculate_text_similarity(a: &str, b: &str) -> f32 {
        // Simple Jaccard similarity for word overlap
        let words_a: std::collections::HashSet<&str> = a.split_whitespace().collect();
        let words_b: std::collections::HashSet<&str> = b.split_whitespace().collect();

        let intersection = words_a.intersection(&words_b).count();
        let union = words_a.union(&words_b).count();

        if union == 0 {
            0.0
        } else {
            intersection as f32 / union as f32
        }
    }

    pub fn calculate_p_value(group1: &[f32], group2: &[f32]) -> Result<f32> {
        // Simplified t-test implementation
        if group1.is_empty() || group2.is_empty() {
            return Ok(1.0);
        }

        let mean1 = group1.iter().sum::<f32>() / group1.len() as f32;
        let mean2 = group2.iter().sum::<f32>() / group2.len() as f32;

        let var1 = Self::calculate_variance(group1, mean1);
        let var2 = Self::calculate_variance(group2, mean2);

        let pooled_var = ((group1.len() - 1) as f32 * var1 + (group2.len() - 1) as f32 * var2)
            / (group1.len() + group2.len() - 2) as f32;

        let se = (pooled_var * (1.0 / group1.len() as f32 + 1.0 / group2.len() as f32)).sqrt();

        if se == 0.0 {
            return Ok(1.0);
        }

        let t_stat = (mean1 - mean2).abs() / se;

        // Approximate p-value (simplified)
        if t_stat > 2.0 {
            Ok(0.05)
        } else if t_stat > 1.5 {
            Ok(0.1)
        } else {
            Ok(0.5)
        }
    }

    fn calculate_variance(values: &[f32], mean: f32) -> f32 {
        if values.is_empty() {
            return 0.0;
        }

        values.iter().map(|x| (x - mean).powi(2)).sum::<f32>() / values.len() as f32
    }

    pub fn calculate_effect_size(group1: &[f32], group2: &[f32]) -> Result<f32> {
        if group1.is_empty() || group2.is_empty() {
            return Ok(0.0);
        }

        let mean1 = group1.iter().sum::<f32>() / group1.len() as f32;
        let mean2 = group2.iter().sum::<f32>() / group2.len() as f32;

        let var1 = Self::calculate_variance(group1, mean1);
        let var2 = Self::calculate_variance(group2, mean2);

        let pooled_std = ((var1 + var2) / 2.0).sqrt();

        if pooled_std == 0.0 {
            Ok(0.0)
        } else {
            Ok((mean1 - mean2).abs() / pooled_std)
        }
    }
}
