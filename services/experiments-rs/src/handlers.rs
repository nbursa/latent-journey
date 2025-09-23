use crate::runner::ExperimentRunner;
use crate::types::{ApiResponse, ExperimentRequest, ExperimentResult, ExperimentStatus};
use anyhow::Result;
use serde_json::json;
use std::sync::Arc;
use warp::reply::json as warp_json;
use warp::Rejection;

pub async fn run_experiment(
    request: ExperimentRequest,
    runner: Arc<ExperimentRunner>,
) -> Result<impl warp::Reply, Rejection> {
    match runner
        .run_experiment(&request.experiment_id, request.config.as_ref())
        .await
    {
        Ok(result) => Ok(warp_json(&ApiResponse::success(result))),
        Err(e) => Ok(warp_json(&ApiResponse::<ExperimentResult>::error(
            e.to_string(),
        ))),
    }
}

pub async fn run_all_experiments(
    runner: Arc<ExperimentRunner>,
) -> Result<impl warp::Reply, Rejection> {
    let experiments = vec![
        "EXP-01", "EXP-02", "EXP-03", "EXP-04", "EXP-05", "EXP-06", "EXP-07", "EXP-08",
    ];

    let mut results = Vec::new();

    for exp_id in experiments {
        match runner
            .run_experiment(exp_id, None) // Use shared config
            .await
        {
            Ok(result) => results.push(result),
            Err(e) => {
                tracing::error!("Failed to run experiment {}: {}", exp_id, e);
            }
        }
    }

    Ok(warp_json(&ApiResponse::success(results)))
}

pub async fn get_experiment_results(
    runner: Arc<ExperimentRunner>,
) -> Result<impl warp::Reply, Rejection> {
    match runner.get_stored_results().await {
        Ok(results) => Ok(warp_json(&ApiResponse::success(results))),
        Err(e) => {
            tracing::error!("Failed to get stored results: {}", e);
            Ok(warp_json(&ApiResponse::<Vec<ExperimentResult>>::error(
                format!("Failed to get results: {}", e),
            )))
        }
    }
}

pub async fn get_experiment_summary(
    runner: Arc<ExperimentRunner>,
) -> Result<impl warp::Reply, Rejection> {
    match runner.get_stored_results().await {
        Ok(results) => {
            let mut experiment_status = std::collections::HashMap::new();

            // Process results to get status for each experiment (use latest result per experiment)
            for result in &results {
                // Skip if we already have a result for this experiment (results are sorted by timestamp desc)
                if experiment_status.contains_key(&result.experiment_id) {
                    continue;
                }

                let status = if result.success {
                    "completed".to_string()
                } else {
                    // Check if this is an invalid experiment (MC failure)
                    if let Some(metadata) = result.raw_data.get("experiment_metadata") {
                        if let Some(status_str) = metadata.get("status").and_then(|s| s.as_str()) {
                            if status_str == "INVALID" {
                                "invalid".to_string()
                            } else {
                                "failed".to_string()
                            }
                        } else {
                            "failed".to_string()
                        }
                    } else {
                        "failed".to_string()
                    }
                };
                experiment_status.insert(
                    result.experiment_id.clone(),
                    (status, result.metrics.clone()),
                );
            }

            let experiments = vec![
                ("EXP-01", "Editable vs Transparent Self-Model"),
                ("EXP-02", "Synthetic Trauma"),
                ("EXP-03", "Subjective Input Bias"),
                ("EXP-04", "Observation vs Experience"),
                ("EXP-05", "Reflection Entropy Drift"),
                ("EXP-06", "Self-Model Divergence"),
                ("EXP-07", "Predictive Hallucination"),
                ("EXP-08", "Superego Alignment Filter"),
            ];

            let experiment_list: Vec<serde_json::Value> = experiments
                .iter()
                .map(|(id, name)| {
                    let (status, metrics) = experiment_status
                        .get(*id)
                        .map(|(s, m)| (s.as_str(), Some(m)))
                        .unwrap_or(("not_run", None));

                    // Add MC indicators for EXP-01
                    let mut experiment_data = json!({
                        "id": id,
                        "name": name,
                        "status": status,
                        "last_metrics": metrics
                    });

                    if *id == "EXP-01" {
                        if let Some(result) = results.iter().find(|r| r.experiment_id == *id) {
                            if let Some(mc_summary) =
                                result.raw_data.get("manipulation_check_summary")
                            {
                                if let Some(valid_seeds) = mc_summary.get("valid_seeds") {
                                    if let Some(total_seeds) = mc_summary.get("total_seeds") {
                                        experiment_data["mc_valid_seeds"] = valid_seeds.clone();
                                        experiment_data["mc_total_seeds"] = total_seeds.clone();
                                    }
                                }
                                if let Some(avg_applied_reflections) =
                                    mc_summary.get("avg_applied_reflections_editable")
                                {
                                    experiment_data["mc_avg_applied_reflections"] =
                                        avg_applied_reflections.clone();
                                }
                                if let Some(avg_delta_self_summary) =
                                    mc_summary.get("avg_delta_self_summary_norm_editable")
                                {
                                    experiment_data["mc_avg_delta_self_summary"] =
                                        avg_delta_self_summary.clone();
                                }
                            }
                        }
                    }

                    experiment_data
                })
                .collect();

            let completed = results.iter().filter(|r| r.success).count();
            let failed = results.iter().filter(|r| !r.success).count();
            let last_run = results.first().map(|r| r.timestamp);

            let summary = json!({
                "total_experiments": 8,
                "completed": completed,
                "failed": failed,
                "running": false,
                "last_run": last_run,
                "experiments": experiment_list
            });

            Ok(warp_json(&ApiResponse::success(summary)))
        }
        Err(e) => {
            tracing::error!("Failed to get stored results for summary: {}", e);
            Ok(warp_json(&ApiResponse::<serde_json::Value>::error(
                format!("Failed to get summary: {}", e),
            )))
        }
    }
}

pub async fn get_experiment_status(
    _runner: Arc<ExperimentRunner>,
) -> Result<impl warp::Reply, Rejection> {
    let status = ExperimentStatus {
        running: false,
        current_experiment: None,
        progress: 0.0,
        completed_experiments: vec![],
        failed_experiments: vec![],
    };

    Ok(warp_json(&ApiResponse::success(status)))
}
