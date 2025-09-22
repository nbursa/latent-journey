// use crate::types::{AgentRunResult, AgentMetrics};
use anyhow::Result;
use std::collections::HashMap;

pub struct StatisticalAnalyzer;

impl StatisticalAnalyzer {
    /// Calculate entropy using improved method
    /// Combines: (1) distribution entropy, (2) lexical diversity, (3) semantic variance
    pub fn calculate_entropy(values: &[f32]) -> f32 {
        if values.is_empty() {
            return 0.0;
        }

        // Method 1: Distribution entropy (original)
        let distribution_entropy = Self::calculate_distribution_entropy(values);

        // Method 2: Lexical diversity (type-token ratio approximation)
        let lexical_diversity = Self::calculate_lexical_diversity(values);

        // Method 3: Semantic variance (standard deviation of embeddings)
        let semantic_variance = Self::calculate_semantic_variance(values);

        // Weighted combination
        0.4 * distribution_entropy + 0.3 * lexical_diversity + 0.3 * semantic_variance
    }

    fn calculate_distribution_entropy(values: &[f32]) -> f32 {
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

    fn calculate_lexical_diversity(values: &[f32]) -> f32 {
        if values.is_empty() {
            return 0.0;
        }

        // Approximate type-token ratio using unique value count
        // Round to avoid floating point precision issues
        let rounded_values: Vec<i32> = values
            .iter()
            .map(|&x| (x * 1000.0).round() as i32)
            .collect();
        let unique_count = rounded_values
            .iter()
            .collect::<std::collections::HashSet<_>>()
            .len();
        unique_count as f32 / values.len() as f32
    }

    fn calculate_semantic_variance(values: &[f32]) -> f32 {
        if values.is_empty() {
            return 0.0;
        }

        let mean = values.iter().sum::<f32>() / values.len() as f32;
        let variance = Self::calculate_variance(values, mean);

        variance.sqrt()
    }

    pub fn calculate_variance(values: &[f32], mean: f32) -> f32 {
        if values.is_empty() {
            return 0.0;
        }
        values.iter().map(|&x| (x - mean).powi(2)).sum::<f32>() / values.len() as f32
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

    /// Calculate coherence using improved method
    /// Combines: (1) sentence embedding similarity, (2) topic coherence
    pub fn calculate_coherence(reflections: &[String]) -> f32 {
        if reflections.len() < 2 {
            return 1.0;
        }

        // Method 1: Sentence embedding similarity (cosine)
        let embedding_coherence = Self::calculate_embedding_coherence(reflections);

        // Method 2: Topic coherence (intra-cluster cohesion)
        let topic_coherence = Self::calculate_topic_coherence(reflections);

        // Method 3: Temporal consistency (adjacent reflections)
        let temporal_coherence = Self::calculate_temporal_coherence(reflections);

        // Weighted combination
        0.5 * embedding_coherence + 0.3 * topic_coherence + 0.2 * temporal_coherence
    }

    fn calculate_embedding_coherence(reflections: &[String]) -> f32 {
        if reflections.len() < 2 {
            return 1.0;
        }

        // Simulate sentence embeddings using simple text features
        let mut similarities = Vec::new();
        for i in 0..reflections.len() - 1 {
            let embedding_a = Self::text_to_simple_embedding(&reflections[i]);
            let embedding_b = Self::text_to_simple_embedding(&reflections[i + 1]);
            let similarity = Self::calculate_cosine_similarity(&embedding_a, &embedding_b);
            similarities.push(similarity);
        }

        similarities.iter().sum::<f32>() / similarities.len() as f32
    }

    fn text_to_simple_embedding(text: &str) -> Vec<f32> {
        // Simple embedding based on character n-grams and word features
        let words: Vec<&str> = text.split_whitespace().collect();
        let mut embedding = vec![0.0; 10]; // Simple 10-dim embedding

        // Word count feature
        embedding[0] = words.len() as f32 / 100.0; // Normalize

        // Average word length
        if !words.is_empty() {
            embedding[1] =
                words.iter().map(|w| w.len()).sum::<usize>() as f32 / words.len() as f32 / 20.0;
        }

        // Character n-gram features (simplified)
        let chars: Vec<char> = text.chars().collect();
        for i in 0..8 {
            if i < chars.len() {
                embedding[2 + i] = chars[i] as u32 as f32 / 128.0; // Normalize ASCII
            }
        }

        embedding
    }

    fn calculate_topic_coherence(reflections: &[String]) -> f32 {
        if reflections.is_empty() {
            return 1.0;
        }

        // Simple topic coherence based on word frequency consistency
        let mut word_counts = HashMap::new();
        for reflection in reflections {
            for word in reflection.split_whitespace() {
                *word_counts.entry(word.to_lowercase()).or_insert(0) += 1;
            }
        }

        let total_words: usize = word_counts.values().sum();
        if total_words == 0 {
            return 1.0;
        }

        // Calculate consistency: how evenly distributed are the top words?
        let mut frequencies: Vec<f32> = word_counts
            .values()
            .map(|&c| c as f32 / total_words as f32)
            .collect();
        frequencies.sort_by(|a, b| b.partial_cmp(a).unwrap());

        // Entropy of word distribution (higher = more coherent topics)
        let entropy = frequencies
            .iter()
            .filter(|&&f| f > 0.0)
            .map(|&f| -f * f.log2())
            .sum::<f32>();

        entropy / (reflections.len() as f32).log2().max(1.0)
    }

    fn calculate_temporal_coherence(reflections: &[String]) -> f32 {
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
        // Improved Jaccard similarity with stemming approximation
        let words_a: std::collections::HashSet<String> = a
            .split_whitespace()
            .map(|w| {
                w.to_lowercase()
                    .trim_matches(|c: char| !c.is_alphanumeric())
                    .to_string()
            })
            .filter(|w| !w.is_empty())
            .collect();
        let words_b: std::collections::HashSet<String> = b
            .split_whitespace()
            .map(|w| {
                w.to_lowercase()
                    .trim_matches(|c: char| !c.is_alphanumeric())
                    .to_string()
            })
            .filter(|w| !w.is_empty())
            .collect();

        let intersection = words_a.intersection(&words_b).count();
        let union = words_a.union(&words_b).count();

        if union == 0 {
            0.0
        } else {
            intersection as f32 / union as f32
        }
    }

    /// Calculate p-value using Welch's t-test (unequal variances)
    pub fn calculate_p_value(group1: &[f32], group2: &[f32]) -> Result<f32> {
        if group1.is_empty() || group2.is_empty() {
            return Ok(1.0);
        }

        let mean1 = group1.iter().sum::<f32>() / group1.len() as f32;
        let mean2 = group2.iter().sum::<f32>() / group2.len() as f32;

        let var1 = Self::calculate_variance(group1, mean1);
        let var2 = Self::calculate_variance(group2, mean2);

        // Welch's t-test for unequal variances
        let se = (var1 / group1.len() as f32 + var2 / group2.len() as f32).sqrt();

        if se == 0.0 {
            return Ok(1.0);
        }

        let t_stat = (mean1 - mean2).abs() / se;

        // Degrees of freedom for Welch's t-test
        let df = ((var1 / group1.len() as f32 + var2 / group2.len() as f32).powi(2))
            / ((var1 / group1.len() as f32).powi(2) / (group1.len() - 1) as f32
                + (var2 / group2.len() as f32).powi(2) / (group2.len() - 1) as f32);

        // Approximate p-value using t-distribution approximation
        Self::approximate_t_test_p_value(t_stat, df as u32)
    }

    fn approximate_t_test_p_value(t_stat: f32, df: u32) -> Result<f32> {
        // Simplified approximation of t-test p-value
        // For more accuracy, would need proper t-distribution implementation
        let critical_95 = if df >= 30 {
            1.96
        } else if df >= 10 {
            2.0
        } else {
            2.5
        };
        let critical_99 = if df >= 30 {
            2.58
        } else if df >= 10 {
            2.8
        } else {
            3.0
        };

        if t_stat > critical_99 {
            Ok(0.01)
        } else if t_stat > critical_95 {
            Ok(0.05)
        } else if t_stat > 1.5 {
            Ok(0.1)
        } else {
            Ok(0.5)
        }
    }

    /// Calculate Cohen's d effect size
    pub fn calculate_effect_size(group1: &[f32], group2: &[f32]) -> Result<f32> {
        if group1.is_empty() || group2.is_empty() {
            return Ok(0.0);
        }

        let mean1 = group1.iter().sum::<f32>() / group1.len() as f32;
        let mean2 = group2.iter().sum::<f32>() / group2.len() as f32;

        let var1 = Self::calculate_variance(group1, mean1);
        let var2 = Self::calculate_variance(group2, mean2);

        // Pooled standard deviation for Cohen's d
        let pooled_var = ((group1.len() - 1) as f32 * var1 + (group2.len() - 1) as f32 * var2)
            / (group1.len() + group2.len() - 2) as f32;
        let pooled_std = pooled_var.sqrt();

        if pooled_std == 0.0 {
            return Ok(0.0);
        }

        Ok((mean1 - mean2) / pooled_std)
    }

    /// Calculate 95% confidence interval for difference between groups
    pub fn calculate_confidence_interval(group1: &[f32], group2: &[f32]) -> Result<(f32, f32)> {
        if group1.is_empty() || group2.is_empty() {
            return Ok((0.0, 0.0));
        }

        let mean1 = group1.iter().sum::<f32>() / group1.len() as f32;
        let mean2 = group2.iter().sum::<f32>() / group2.len() as f32;
        let diff = mean1 - mean2;

        let var1 = Self::calculate_variance(group1, mean1);
        let var2 = Self::calculate_variance(group2, mean2);

        // Standard error for difference
        let se = (var1 / group1.len() as f32 + var2 / group2.len() as f32).sqrt();

        if se == 0.0 {
            return Ok((diff, diff));
        }

        // Approximate 95% CI using t-distribution (simplified)
        let t_critical = 1.96; // For large samples, approximate with normal distribution
        let margin = t_critical * se;

        Ok((diff - margin, diff + margin))
    }

    /// Calculate ANOVA F-statistic for multiple groups
    pub fn calculate_anova_f_statistic(groups: &[&[f32]]) -> Result<f32> {
        if groups.is_empty() || groups.iter().any(|g| g.is_empty()) {
            return Ok(0.0);
        }

        // Calculate overall mean
        let total_count: usize = groups.iter().map(|g| g.len()).sum();
        let total_sum: f32 = groups.iter().map(|g| g.iter().sum::<f32>()).sum();
        let grand_mean = total_sum / total_count as f32;

        // Between-group sum of squares
        let mut ss_between = 0.0;
        for group in groups {
            let group_mean = group.iter().sum::<f32>() / group.len() as f32;
            ss_between += group.len() as f32 * (group_mean - grand_mean).powi(2);
        }

        // Within-group sum of squares
        let mut ss_within = 0.0;
        for group in groups {
            let group_mean = group.iter().sum::<f32>() / group.len() as f32;
            for &value in *group {
                ss_within += (value - group_mean).powi(2);
            }
        }

        // Degrees of freedom
        let df_between = groups.len() - 1;
        let df_within = total_count - groups.len();

        if df_between == 0 || df_within == 0 {
            return Ok(0.0);
        }

        // F-statistic
        let ms_between = ss_between / df_between as f32;
        let ms_within = ss_within / df_within as f32;

        if ms_within == 0.0 {
            return Ok(0.0);
        }

        Ok(ms_between / ms_within)
    }
}
