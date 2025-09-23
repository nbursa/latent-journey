// use crate::types::{AgentRunResult, AgentMetrics};
use anyhow::Result;
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
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

    /// Calculate p-value using permutation test (robust, no external dependencies)
    pub fn calculate_p_value(group1: &[f32], group2: &[f32]) -> Result<f32> {
        Self::calculate_p_value_with_seed(group1, group2, 42) // Default seed
    }

    /// Calculate p-value using permutation test with specific seed for reproducibility
    pub fn calculate_p_value_with_seed(group1: &[f32], group2: &[f32], seed: u64) -> Result<f32> {
        if group1.is_empty() || group2.is_empty() {
            return Ok(1.0);
        }

        // Calculate observed difference
        let mean1 = group1.iter().sum::<f32>() / group1.len() as f32;
        let mean2 = group2.iter().sum::<f32>() / group2.len() as f32;
        let observed_diff = (mean1 - mean2).abs();

        // Combine all data for permutation
        let mut combined = Vec::new();
        combined.extend_from_slice(group1);
        combined.extend_from_slice(group2);

        // Perform permutation test with seeded RNG
        let n_permutations = 1000; // Adjust based on computational budget
        let mut extreme_count = 0;
        let mut rng = ChaCha8Rng::seed_from_u64(seed);

        for _ in 0..n_permutations {
            // Shuffle combined data with seeded RNG
            Self::shuffle_slice_with_rng(&mut combined, &mut rng);

            // Split back into two groups
            let perm_group1 = &combined[..group1.len()];
            let perm_group2 = &combined[group1.len()..];

            // Calculate permuted difference
            let perm_mean1 = perm_group1.iter().sum::<f32>() / perm_group1.len() as f32;
            let perm_mean2 = perm_group2.iter().sum::<f32>() / perm_group2.len() as f32;
            let perm_diff = (perm_mean1 - perm_mean2).abs();

            // Count extreme values
            if perm_diff >= observed_diff {
                extreme_count += 1;
            }
        }

        // Avoid zero p-values: (extreme_count + 1) / (n_permutations + 1)
        Ok((extreme_count + 1) as f32 / (n_permutations + 1) as f32)
    }

    /// Shuffle a slice in-place using Fisher-Yates algorithm with seeded RNG
    fn shuffle_slice_with_rng<T, R: Rng>(slice: &mut [T], rng: &mut R) {
        for i in (1..slice.len()).rev() {
            let j = rng.gen_range(0..=i);
            slice.swap(i, j);
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

    /// Calculate 95% confidence interval using bootstrap percentile method
    pub fn calculate_confidence_interval(group1: &[f32], group2: &[f32]) -> Result<(f32, f32)> {
        Self::calculate_confidence_interval_with_seed(group1, group2, 42) // Default seed
    }

    /// Calculate 95% confidence interval using bootstrap percentile method with seed
    pub fn calculate_confidence_interval_with_seed(
        group1: &[f32],
        group2: &[f32],
        seed: u64,
    ) -> Result<(f32, f32)> {
        if group1.is_empty() || group2.is_empty() {
            return Ok((0.0, 0.0));
        }

        // Bootstrap sampling with seeded RNG
        let n_bootstrap = 1000;
        let mut bootstrap_diffs = Vec::new();
        let mut rng = ChaCha8Rng::seed_from_u64(seed);

        for _ in 0..n_bootstrap {
            // Bootstrap sample from group1
            let mut bootstrap_group1 = Vec::new();
            for _ in 0..group1.len() {
                let idx = rng.gen_range(0..group1.len());
                bootstrap_group1.push(group1[idx]);
            }

            // Bootstrap sample from group2
            let mut bootstrap_group2 = Vec::new();
            for _ in 0..group2.len() {
                let idx = rng.gen_range(0..group2.len());
                bootstrap_group2.push(group2[idx]);
            }

            // Calculate difference
            let mean1 = bootstrap_group1.iter().sum::<f32>() / bootstrap_group1.len() as f32;
            let mean2 = bootstrap_group2.iter().sum::<f32>() / bootstrap_group2.len() as f32;
            bootstrap_diffs.push(mean1 - mean2);
        }

        // Sort and get percentiles
        bootstrap_diffs.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let lower_idx = (0.025 * bootstrap_diffs.len() as f32) as usize;
        let upper_idx = (0.975 * bootstrap_diffs.len() as f32) as usize;

        Ok((bootstrap_diffs[lower_idx], bootstrap_diffs[upper_idx]))
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

    /// Calculate p-value for ANOVA using permutation test
    pub fn calculate_anova_p_value(groups: &[&[f32]]) -> Result<f32> {
        if groups.is_empty() || groups.iter().any(|g| g.is_empty()) {
            return Ok(1.0);
        }

        // Calculate observed F-statistic
        let observed_f = Self::calculate_anova_f_statistic(groups)?;

        // Combine all data for permutation
        let mut combined = Vec::new();
        for group in groups {
            combined.extend_from_slice(group);
        }

        // Perform permutation test with seeded RNG
        let n_permutations = 1000;
        let mut extreme_count = 0;
        let mut rng = ChaCha8Rng::seed_from_u64(1337); // Fixed seed for reproducibility

        for _ in 0..n_permutations {
            // Shuffle combined data with seeded RNG
            Self::shuffle_slice_with_rng(&mut combined, &mut rng);

            // Recreate groups with same sizes
            let mut perm_groups = Vec::new();
            let mut start = 0;
            for group in groups {
                let end = start + group.len();
                perm_groups.push(&combined[start..end]);
                start = end;
            }

            // Calculate permuted F-statistic
            let perm_f = Self::calculate_anova_f_statistic(&perm_groups)?;

            // Count extreme values
            if perm_f >= observed_f {
                extreme_count += 1;
            }
        }

        // Avoid zero p-values: (extreme_count + 1) / (n_permutations + 1)
        Ok((extreme_count + 1) as f32 / (n_permutations + 1) as f32)
    }

    /// Calculate Benjamini-Hochberg FDR correction for multiple comparisons
    pub fn calculate_fdr_correction(p_values: &[f32]) -> Vec<f32> {
        if p_values.is_empty() {
            return Vec::new();
        }

        // Create indices and sort by p-value
        let mut indexed_p: Vec<(usize, f32)> =
            p_values.iter().enumerate().map(|(i, &p)| (i, p)).collect();
        indexed_p.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());

        let m = p_values.len() as f32;
        let mut corrected = vec![0.0; p_values.len()];

        // Apply Benjamini-Hochberg procedure
        for (rank, (original_idx, p_value)) in indexed_p.iter().enumerate() {
            let rank_f = (rank + 1) as f32;
            let corrected_p = p_value * m / rank_f;
            corrected[*original_idx] = corrected_p.min(1.0);
        }

        corrected
    }

    /// Calculate windowed entropy over time series
    pub fn calculate_windowed_entropy(
        values: &[f32],
        window_size: usize,
        stride: usize,
    ) -> Vec<f32> {
        if values.is_empty() || window_size == 0 || window_size > values.len() {
            return Vec::new();
        }

        let mut windowed_entropies = Vec::new();
        let mut start = 0;

        while start + window_size <= values.len() {
            let window = &values[start..start + window_size];
            let entropy = Self::calculate_entropy(window);
            windowed_entropies.push(entropy);
            start += stride;
        }

        windowed_entropies
    }

    /// Calculate windowed coherence over time series
    pub fn calculate_windowed_coherence(
        texts: &[String],
        window_size: usize,
        stride: usize,
    ) -> Vec<f32> {
        if texts.is_empty() || window_size == 0 || window_size > texts.len() {
            return Vec::new();
        }

        let mut windowed_coherences = Vec::new();
        let mut start = 0;

        while start + window_size <= texts.len() {
            let window = &texts[start..start + window_size];
            let coherence = Self::calculate_coherence(window);
            windowed_coherences.push(coherence);
            start += stride;
        }

        windowed_coherences
    }

    /// Calculate linear trend slope using simple linear regression
    pub fn calculate_trend_slope(values: &[f32]) -> f32 {
        if values.len() < 2 {
            return 0.0;
        }

        let n = values.len() as f32;
        let x_mean = (n - 1.0) / 2.0; // x values are 0, 1, 2, ..., n-1
        let y_mean = values.iter().sum::<f32>() / n;

        let mut numerator = 0.0;
        let mut denominator = 0.0;

        for (i, &y) in values.iter().enumerate() {
            let x = i as f32;
            numerator += (x - x_mean) * (y - y_mean);
            denominator += (x - x_mean).powi(2);
        }

        if denominator == 0.0 {
            0.0
        } else {
            numerator / denominator
        }
    }

    /// Calculate Mann-Kendall trend test (simplified version)
    /// Returns: (S statistic, p-value approximation)
    pub fn calculate_mann_kendall_trend(values: &[f32]) -> (f32, f32) {
        if values.len() < 3 {
            return (0.0, 1.0);
        }

        let mut s = 0;
        let n = values.len();

        // Calculate S statistic
        for i in 0..n - 1 {
            for j in i + 1..n {
                if values[j] > values[i] {
                    s += 1;
                } else if values[j] < values[i] {
                    s -= 1;
                }
                // If equal, no change to S
            }
        }

        // Approximate p-value (simplified)
        let s_f = s as f32;
        let n_f = n as f32;
        let variance = (n_f * (n_f - 1.0) * (2.0 * n_f + 5.0)) / 18.0;
        let z = if variance > 0.0 {
            s_f / variance.sqrt()
        } else {
            0.0
        };

        // Approximate p-value using normal distribution
        let p_value = if z.abs() > 2.58 {
            0.01
        } else if z.abs() > 1.96 {
            0.05
        } else if z.abs() > 1.65 {
            0.1
        } else {
            0.5
        };

        (s_f, p_value)
    }

    /// Detect hallucinations by comparing reflection content with input context
    /// Returns: (hallucination_count, hallucination_rate, confidence_scores)
    pub fn detect_hallucinations(
        reflections: &[String],
        input_contexts: &[String],
        similarity_threshold: f32,
    ) -> (usize, f32, Vec<f32>) {
        if reflections.is_empty() || input_contexts.is_empty() {
            return (0, 0.0, Vec::new());
        }

        let mut hallucination_count = 0;
        let mut confidence_scores = Vec::new();

        for (i, reflection) in reflections.iter().enumerate() {
            // Find the most relevant input context (simplified: use same index or closest)
            let context_idx = i.min(input_contexts.len() - 1);
            let context = &input_contexts[context_idx];

            // Calculate content similarity
            let similarity = Self::calculate_text_similarity(reflection, context);
            confidence_scores.push(similarity);

            // Check for hallucination indicators
            let is_hallucination =
                Self::is_hallucination(reflection, context, similarity, similarity_threshold);
            if is_hallucination {
                hallucination_count += 1;
            }
        }

        let hallucination_rate = hallucination_count as f32 / reflections.len() as f32;
        (hallucination_count, hallucination_rate, confidence_scores)
    }

    /// Determine if a reflection is likely a hallucination
    fn is_hallucination(reflection: &str, context: &str, similarity: f32, threshold: f32) -> bool {
        // Low similarity with context
        if similarity < threshold {
            return true;
        }

        // Check for hallucination indicators
        let hallucination_indicators = [
            "I remember",
            "I recall",
            "I know",
            "I believe",
            "I think",
            "definitely",
            "certainly",
            "absolutely",
            "without a doubt",
            "I'm sure",
            "I'm certain",
            "I'm confident",
        ];

        let reflection_lower = reflection.to_lowercase();
        let context_lower = context.to_lowercase();

        // Count hallucination indicators in reflection
        let reflection_indicators = hallucination_indicators
            .iter()
            .filter(|&&indicator| reflection_lower.contains(indicator))
            .count();

        // Count hallucination indicators in context
        let context_indicators = hallucination_indicators
            .iter()
            .filter(|&&indicator| context_lower.contains(indicator))
            .count();

        // If reflection has more indicators than context, likely hallucination
        if reflection_indicators > context_indicators {
            return true;
        }

        // Check for novel entities not in context
        let reflection_words: std::collections::HashSet<String> = reflection_lower
            .split_whitespace()
            .map(|w| w.trim_matches(|c: char| !c.is_alphanumeric()).to_string())
            .filter(|w| w.len() > 3) // Only consider longer words
            .collect();

        let context_words: std::collections::HashSet<String> = context_lower
            .split_whitespace()
            .map(|w| w.trim_matches(|c: char| !c.is_alphanumeric()).to_string())
            .filter(|w| w.len() > 3)
            .collect();

        // If reflection introduces many new entities not in context
        let novel_entities = reflection_words.difference(&context_words).count();
        if novel_entities > 3 {
            // More than 3 novel entities
            return true;
        }

        false
    }

    /// Calculate toxicity score based on content analysis
    pub fn calculate_toxicity_score(content: &str) -> f32 {
        let content_lower = content.to_lowercase();

        // Simple toxicity indicators (in a real system, this would be more sophisticated)
        let toxic_indicators = [
            "hate", "harm", "violence", "abuse", "threat", "danger", "kill", "hurt", "destroy",
            "damage", "toxic", "poison",
        ];

        let mut toxicity_score: f32 = 0.0;
        for indicator in &toxic_indicators {
            if content_lower.contains(indicator) {
                toxicity_score += 0.2;
            }
        }

        // Check for negative emotional language
        let negative_emotions = [
            "angry",
            "furious",
            "rage",
            "hate",
            "despise",
            "loathe",
            "disgust",
            "revulsion",
            "contempt",
            "scorn",
        ];

        for emotion in &negative_emotions {
            if content_lower.contains(emotion) {
                toxicity_score += 0.1;
            }
        }

        toxicity_score.min(1.0) // Cap at 1.0
    }
}
