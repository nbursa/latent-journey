// Individual experiment implementations
// This module contains the specific logic for each experiment
//
// NOTE: All experiment logic has been moved to runner.rs for better organization
// and to avoid code duplication. This file is kept for future extensibility.

use crate::types::*;
use anyhow::Result;

// Re-export the main experiment runner for external use
pub use crate::runner::ExperimentRunner;

// Individual experiment structs for future extensibility
pub struct Experiment01EditableVsTransparent;
pub struct Experiment02SyntheticTrauma;
pub struct Experiment03SubjectiveInputBias;
pub struct Experiment04ObservationVsExperience;
pub struct Experiment05ReflectionEntropyDrift;
pub struct Experiment06SelfModelDivergence;
pub struct Experiment07PredictiveHallucination;
pub struct Experiment08SuperegoAlignmentFilter;

// Placeholder implementations that delegate to the main runner
// These can be extended in the future for specialized experiment logic

impl Experiment01EditableVsTransparent {
    pub fn run() -> Result<ExperimentResult> {
        // This is a placeholder - actual implementation is in runner.rs
        Err(anyhow::anyhow!(
            "Use ExperimentRunner::run_experiment(\"EXP-01\") instead"
        ))
    }
}

impl Experiment02SyntheticTrauma {
    pub fn run() -> Result<ExperimentResult> {
        Err(anyhow::anyhow!(
            "Use ExperimentRunner::run_experiment(\"EXP-02\") instead"
        ))
    }
}

impl Experiment03SubjectiveInputBias {
    pub fn run() -> Result<ExperimentResult> {
        Err(anyhow::anyhow!(
            "Use ExperimentRunner::run_experiment(\"EXP-03\") instead"
        ))
    }
}

impl Experiment04ObservationVsExperience {
    pub fn run() -> Result<ExperimentResult> {
        Err(anyhow::anyhow!(
            "Use ExperimentRunner::run_experiment(\"EXP-04\") instead"
        ))
    }
}

impl Experiment05ReflectionEntropyDrift {
    pub fn run() -> Result<ExperimentResult> {
        Err(anyhow::anyhow!(
            "Use ExperimentRunner::run_experiment(\"EXP-05\") instead"
        ))
    }
}

impl Experiment06SelfModelDivergence {
    pub fn run() -> Result<ExperimentResult> {
        Err(anyhow::anyhow!(
            "Use ExperimentRunner::run_experiment(\"EXP-06\") instead"
        ))
    }
}

impl Experiment07PredictiveHallucination {
    pub fn run() -> Result<ExperimentResult> {
        Err(anyhow::anyhow!(
            "Use ExperimentRunner::run_experiment(\"EXP-07\") instead"
        ))
    }
}

impl Experiment08SuperegoAlignmentFilter {
    pub fn run() -> Result<ExperimentResult> {
        Err(anyhow::anyhow!(
            "Use ExperimentRunner::run_experiment(\"EXP-08\") instead"
        ))
    }
}
