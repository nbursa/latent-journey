use experiments_rs::{handlers, runner::ExperimentRunner, types::ExperimentConfig};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, Level};
use warp::Filter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment variables from .env file
    dotenv::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::fmt().with_max_level(Level::INFO).init();

    info!("Starting Experiments service on port 8086");

    // Load experiment configuration
    let config = ExperimentConfig::load_from_file("config/experiments.yaml")?;
    let config = Arc::new(RwLock::new(config));

    // Initialize experiment runner
    let runner = Arc::new(ExperimentRunner::new(config.clone()).await?);

    // Health check endpoint
    let health = warp::path("health").and(warp::get()).map(|| {
        warp::reply::json(&serde_json::json!({
            "status": "healthy",
            "service": "experiments-rs"
        }))
    });

    // Run single experiment endpoint
    let run_experiment = warp::path("api")
        .and(warp::path("experiments"))
        .and(warp::path("run"))
        .and(warp::post())
        .and(warp::body::json())
        .and(with_runner(runner.clone()))
        .and_then(handlers::run_experiment);

    // Run all experiments endpoint
    let run_all_experiments = warp::path("api")
        .and(warp::path("experiments"))
        .and(warp::path("run-all"))
        .and(warp::post())
        .and(with_runner(runner.clone()))
        .and_then(handlers::run_all_experiments);

    // Get experiment results endpoint
    let get_results = warp::path("api")
        .and(warp::path("experiments"))
        .and(warp::path("results"))
        .and(warp::get())
        .and(with_runner(runner.clone()))
        .and_then(handlers::get_experiment_results);

    // Get experiment status endpoint
    let get_status = warp::path("api")
        .and(warp::path("experiments"))
        .and(warp::path("status"))
        .and(warp::get())
        .and(with_runner(runner.clone()))
        .and_then(handlers::get_experiment_status);

    // Get experiment summary endpoint
    let get_summary = warp::path("api")
        .and(warp::path("experiments"))
        .and(warp::path("summary"))
        .and(warp::get())
        .and(with_runner(runner.clone()))
        .and_then(handlers::get_experiment_summary);

    let routes = health
        .or(run_experiment)
        .or(run_all_experiments)
        .or(get_results)
        .or(get_status)
        .or(get_summary)
        .with(
            warp::cors()
                .allow_any_origin()
                .allow_headers(vec!["content-type"])
                .allow_methods(vec!["GET", "POST"]),
        );

    info!("Experiments service ready");
    warp::serve(routes).run(([0, 0, 0, 0], 8086)).await;

    Ok(())
}

fn with_runner(
    runner: Arc<ExperimentRunner>,
) -> impl Filter<Extract = (Arc<ExperimentRunner>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || runner.clone())
}
