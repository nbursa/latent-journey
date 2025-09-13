use warp::Filter;

#[tokio::main]
async fn main() {
    println!("Sentience service starting on :8082");
    println!("I am Sentience service");

    let cors = warp::cors()
        .allow_any_origin()
        .allow_headers(vec!["content-type"])
        .allow_methods(vec!["GET", "POST", "OPTIONS"]);

    let ping = warp::path("ping")
        .and(warp::get())
        .map(|| {
            warp::reply::json(&serde_json::json!({
                "message": "I am Sentience service",
                "service": "sentience-rs",
                "status": "running"
            }))
        });

    let healthz = warp::path("healthz")
        .and(warp::get())
        .map(|| {
            use std::time::{SystemTime, UNIX_EPOCH};
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            warp::reply::json(&serde_json::json!({
                "status": "healthy",
                "service": "sentience-rs",
                "timestamp": timestamp
            }))
        });

    let root = warp::path::end()
        .map(|| "I am Sentience service");

    let routes = ping
        .or(healthz)
        .or(root)
        .with(cors);

    warp::serve(routes)
        .run(([0, 0, 0, 0], 8082))
        .await;
}
