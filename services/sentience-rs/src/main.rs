use warp::Filter;

#[tokio::main]
async fn main() {
    println!("Sentience service starting on :8082");
    println!("I am Sentience service");

    let ping = warp::path("ping")
        .and(warp::get())
        .map(|| {
            warp::reply::json(&serde_json::json!({
                "message": "I am Sentience service",
                "service": "sentience-rs",
                "status": "running"
            }))
        });

    let root = warp::path::end()
        .map(|| "I am Sentience service");

    let routes = ping.or(root);

    warp::serve(routes)
        .run(([0, 0, 0, 0], 8082))
        .await;
}
