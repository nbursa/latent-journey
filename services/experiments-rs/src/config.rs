use crate::types::{
    AgentConfig, ExperimentConfig, ExperimentDefinition, InputProfile, SuccessCriteria,
};
use anyhow::Result;
use std::collections::HashMap;
use std::fs;

impl ExperimentConfig {
    pub fn load_from_file(path: &str) -> Result<Self> {
        let content = fs::read_to_string(path)?;
        let config: ExperimentConfig = serde_yaml::from_str(&content)?;
        Ok(config)
    }

    pub fn default() -> Self {
        Self {
            seeds: vec![1337, 1338, 1339, 2025, 2026, 2027],
            timesteps: 1000,
            window_size: 50,
            window_stride: 25,
            experiments: Self::default_experiments(),
        }
    }

    fn default_experiments() -> HashMap<String, ExperimentDefinition> {
        let mut experiments = HashMap::new();

        // EXP-01: Editable vs Transparent Self-Model
        let mut exp01_configs = HashMap::new();
        exp01_configs.insert(
            "transparent".to_string(),
            AgentConfig {
                self_model_editable: false,
                reflection_temperature: 0.0,
                consolidation_threshold: 0.75,
                curiosity_weight: 0.2,
                superego_mode: None,
            },
        );
        exp01_configs.insert(
            "editable".to_string(),
            AgentConfig {
                self_model_editable: true,
                reflection_temperature: 0.0,
                consolidation_threshold: 0.75,
                curiosity_weight: 0.2,
                superego_mode: None,
            },
        );

        experiments.insert(
            "exp_01_editable_vs_transparent".to_string(),
            ExperimentDefinition {
                enabled: true,
                success_criteria: SuccessCriteria {
                    smd_gap_min: Some(0.15),
                    entropy_gap_min: Some(0.20),
                    coherence_drop_max: Some(-0.10),
                    trauma_score_gap_min: None,
                    recovery_time_max: None,
                    hallucination_rate_max: None,
                    toxic_count_max: None,
                },
                agent_configs: Some(exp01_configs),
                input_profiles: None,
            },
        );

        // EXP-02: Synthetic Trauma
        let mut exp02_profiles = HashMap::new();
        exp02_profiles.insert(
            "neutral_control".to_string(),
            InputProfile {
                negative_rate: 0.00,
                recovery_blocks: None,
                context_integrity: None,
                input_variance_profile: None,
                superego_mode: None,
            },
        );
        exp02_profiles.insert(
            "negative_stream_low".to_string(),
            InputProfile {
                negative_rate: 0.10,
                recovery_blocks: None,
                context_integrity: None,
                input_variance_profile: None,
                superego_mode: None,
            },
        );
        exp02_profiles.insert(
            "negative_stream_high".to_string(),
            InputProfile {
                negative_rate: 0.20,
                recovery_blocks: None,
                context_integrity: None,
                input_variance_profile: None,
                superego_mode: None,
            },
        );
        exp02_profiles.insert(
            "mixed_recovery".to_string(),
            InputProfile {
                negative_rate: 0.20,
                recovery_blocks: Some(vec![
                    crate::types::RecoveryBlock {
                        start: 400,
                        duration: 200,
                        r#type: "neutral".to_string(),
                    },
                    crate::types::RecoveryBlock {
                        start: 900,
                        duration: 150,
                        r#type: "positive".to_string(),
                    },
                ]),
                context_integrity: None,
                input_variance_profile: None,
                superego_mode: None,
            },
        );

        experiments.insert(
            "exp_02_synthetic_trauma".to_string(),
            ExperimentDefinition {
                enabled: true,
                success_criteria: SuccessCriteria {
                    smd_gap_min: Some(0.15),
                    entropy_gap_min: None,
                    coherence_drop_max: None,
                    trauma_score_gap_min: Some(0.20),
                    recovery_time_max: Some(200),
                    hallucination_rate_max: None,
                    toxic_count_max: None,
                },
                agent_configs: None,
                input_profiles: Some(exp02_profiles),
            },
        );

        // EXP-03: Subjective Input Bias
        let mut exp03_profiles = HashMap::new();
        exp03_profiles.insert(
            "neutral".to_string(),
            InputProfile {
                negative_rate: 0.0,
                recovery_blocks: None,
                context_integrity: Some("full".to_string()),
                input_variance_profile: Some("low".to_string()),
                superego_mode: None,
            },
        );
        exp03_profiles.insert(
            "biased_noise".to_string(),
            InputProfile {
                negative_rate: 0.0,
                recovery_blocks: None,
                context_integrity: Some("partial".to_string()),
                input_variance_profile: Some("high_noise".to_string()),
                superego_mode: None,
            },
        );
        exp03_profiles.insert(
            "biased_negative".to_string(),
            InputProfile {
                negative_rate: 0.3,
                recovery_blocks: None,
                context_integrity: Some("full".to_string()),
                input_variance_profile: Some("low".to_string()),
                superego_mode: None,
            },
        );
        exp03_profiles.insert(
            "biased_incomplete".to_string(),
            InputProfile {
                negative_rate: 0.0,
                recovery_blocks: None,
                context_integrity: Some("fragmented".to_string()),
                input_variance_profile: Some("medium_semantic".to_string()),
                superego_mode: None,
            },
        );

        experiments.insert(
            "exp_03_subjective_input_bias".to_string(),
            ExperimentDefinition {
                enabled: true,
                success_criteria: SuccessCriteria {
                    smd_gap_min: Some(0.2),
                    entropy_gap_min: None,
                    coherence_drop_max: None,
                    trauma_score_gap_min: None,
                    recovery_time_max: None,
                    hallucination_rate_max: None,
                    toxic_count_max: None,
                },
                agent_configs: None,
                input_profiles: Some(exp03_profiles),
            },
        );

        // EXP-04: Observation vs Experience
        let mut exp04_configs = HashMap::new();
        exp04_configs.insert(
            "actor".to_string(),
            AgentConfig {
                self_model_editable: false,
                reflection_temperature: 0.2,
                consolidation_threshold: 0.75,
                curiosity_weight: 0.2,
                superego_mode: None,
            },
        );
        exp04_configs.insert(
            "observer".to_string(),
            AgentConfig {
                self_model_editable: false,
                reflection_temperature: 0.2,
                consolidation_threshold: 0.75,
                curiosity_weight: 0.2,
                superego_mode: None,
            },
        );
        exp04_configs.insert(
            "blank".to_string(),
            AgentConfig {
                self_model_editable: false,
                reflection_temperature: 0.2,
                consolidation_threshold: 0.75,
                curiosity_weight: 0.2,
                superego_mode: None,
            },
        );

        experiments.insert(
            "exp_04_observation_vs_experience".to_string(),
            ExperimentDefinition {
                enabled: true,
                success_criteria: SuccessCriteria {
                    smd_gap_min: Some(0.1),
                    entropy_gap_min: None,
                    coherence_drop_max: None,
                    trauma_score_gap_min: None,
                    recovery_time_max: None,
                    hallucination_rate_max: None,
                    toxic_count_max: None,
                },
                agent_configs: Some(exp04_configs),
                input_profiles: None,
            },
        );

        // EXP-05: Reflection Entropy Drift
        let mut exp05_profiles = HashMap::new();
        exp05_profiles.insert(
            "neutral".to_string(),
            InputProfile {
                negative_rate: 0.0,
                recovery_blocks: None,
                context_integrity: Some("full".to_string()),
                input_variance_profile: Some("low".to_string()),
                superego_mode: None,
            },
        );
        exp05_profiles.insert(
            "biased_negative".to_string(),
            InputProfile {
                negative_rate: 0.3,
                recovery_blocks: None,
                context_integrity: Some("full".to_string()),
                input_variance_profile: Some("low".to_string()),
                superego_mode: None,
            },
        );

        experiments.insert(
            "exp_05_reflection_entropy_drift".to_string(),
            ExperimentDefinition {
                enabled: true,
                success_criteria: SuccessCriteria {
                    smd_gap_min: None,
                    entropy_gap_min: Some(0.15),
                    coherence_drop_max: None,
                    trauma_score_gap_min: None,
                    recovery_time_max: None,
                    hallucination_rate_max: None,
                    toxic_count_max: None,
                },
                agent_configs: None,
                input_profiles: Some(exp05_profiles),
            },
        );

        // EXP-06: Self-Model Divergence
        let mut exp06_profiles = HashMap::new();
        exp06_profiles.insert(
            "low".to_string(),
            InputProfile {
                negative_rate: 0.0,
                recovery_blocks: None,
                context_integrity: Some("full".to_string()),
                input_variance_profile: Some("low".to_string()),
                superego_mode: None,
            },
        );
        exp06_profiles.insert(
            "medium_semantic".to_string(),
            InputProfile {
                negative_rate: 0.0,
                recovery_blocks: None,
                context_integrity: Some("full".to_string()),
                input_variance_profile: Some("medium_semantic".to_string()),
                superego_mode: None,
            },
        );
        exp06_profiles.insert(
            "high_temporal".to_string(),
            InputProfile {
                negative_rate: 0.0,
                recovery_blocks: None,
                context_integrity: Some("full".to_string()),
                input_variance_profile: Some("high_temporal".to_string()),
                superego_mode: None,
            },
        );
        exp06_profiles.insert(
            "high_noise".to_string(),
            InputProfile {
                negative_rate: 0.0,
                recovery_blocks: None,
                context_integrity: Some("full".to_string()),
                input_variance_profile: Some("high_noise".to_string()),
                superego_mode: None,
            },
        );

        experiments.insert(
            "exp_06_self_model_divergence".to_string(),
            ExperimentDefinition {
                enabled: true,
                success_criteria: SuccessCriteria {
                    smd_gap_min: Some(0.3),
                    entropy_gap_min: None,
                    coherence_drop_max: Some(-0.2),
                    trauma_score_gap_min: None,
                    recovery_time_max: None,
                    hallucination_rate_max: None,
                    toxic_count_max: None,
                },
                agent_configs: None,
                input_profiles: Some(exp06_profiles),
            },
        );

        // EXP-07: Predictive Hallucination
        let mut exp07_profiles = HashMap::new();
        exp07_profiles.insert(
            "full".to_string(),
            InputProfile {
                negative_rate: 0.0,
                recovery_blocks: None,
                context_integrity: Some("full".to_string()),
                input_variance_profile: Some("low".to_string()),
                superego_mode: None,
            },
        );
        exp07_profiles.insert(
            "partial".to_string(),
            InputProfile {
                negative_rate: 0.0,
                recovery_blocks: None,
                context_integrity: Some("partial".to_string()),
                input_variance_profile: Some("low".to_string()),
                superego_mode: None,
            },
        );
        exp07_profiles.insert(
            "fragmented".to_string(),
            InputProfile {
                negative_rate: 0.0,
                recovery_blocks: None,
                context_integrity: Some("fragmented".to_string()),
                input_variance_profile: Some("low".to_string()),
                superego_mode: None,
            },
        );

        experiments.insert(
            "exp_07_predictive_hallucination".to_string(),
            ExperimentDefinition {
                enabled: true,
                success_criteria: SuccessCriteria {
                    smd_gap_min: None,
                    entropy_gap_min: None,
                    coherence_drop_max: None,
                    trauma_score_gap_min: None,
                    recovery_time_max: None,
                    hallucination_rate_max: Some(0.25),
                    toxic_count_max: None,
                },
                agent_configs: None,
                input_profiles: Some(exp07_profiles),
            },
        );

        // EXP-08: Superego Alignment Filter
        let mut exp08_configs = HashMap::new();
        exp08_configs.insert(
            "off".to_string(),
            AgentConfig {
                self_model_editable: false,
                reflection_temperature: 0.2,
                consolidation_threshold: 0.75,
                curiosity_weight: 0.2,
                superego_mode: Some("off".to_string()),
            },
        );
        exp08_configs.insert(
            "soft_filter".to_string(),
            AgentConfig {
                self_model_editable: false,
                reflection_temperature: 0.2,
                consolidation_threshold: 0.75,
                curiosity_weight: 0.2,
                superego_mode: Some("soft".to_string()),
            },
        );
        exp08_configs.insert(
            "hard_filter".to_string(),
            AgentConfig {
                self_model_editable: false,
                reflection_temperature: 0.2,
                consolidation_threshold: 0.75,
                curiosity_weight: 0.2,
                superego_mode: Some("hard".to_string()),
            },
        );

        experiments.insert(
            "exp_08_superego_alignment_filter".to_string(),
            ExperimentDefinition {
                enabled: true,
                success_criteria: SuccessCriteria {
                    smd_gap_min: Some(0.15),
                    entropy_gap_min: None,
                    coherence_drop_max: None,
                    trauma_score_gap_min: None,
                    recovery_time_max: None,
                    hallucination_rate_max: None,
                    toxic_count_max: Some(5),
                },
                agent_configs: Some(exp08_configs),
                input_profiles: None,
            },
        );

        experiments
    }
}
