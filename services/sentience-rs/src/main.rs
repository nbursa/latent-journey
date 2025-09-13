use warp::Filter;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use std::collections::HashMap;

#[derive(Deserialize)]
struct TokenizeRequest {
    embedding_id: String,
    clip_topk: Vec<ClipItem>,
}

#[derive(Deserialize)]
struct ClipItem {
    label: String,
    score: f64,
}

#[derive(Serialize)]
struct SentienceToken {
    #[serde(rename = "type")]
    event_type: String,
    ts: u64,
    embedding_id: String,
    facets: HashMap<String, serde_json::Value>,
}

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

    let tokenize = warp::path("tokenize")
        .and(warp::post())
        .and(warp::body::json())
        .map(|req: TokenizeRequest| {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            
            let mut facets = HashMap::new();
            
            // Mock logic: take top1 label as vision.object
            if let Some(top_item) = req.clip_topk.first() {
                facets.insert("vision.object".to_string(), serde_json::Value::String(top_item.label.clone()));
                
                // Heuristic: valence = score*2-1 (range -1 to +1)
                let valence = top_item.score * 2.0 - 1.0;
                facets.insert("affect.valence".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(valence).unwrap()));
            }
            
            let token = SentienceToken {
                event_type: "sentience.token".to_string(),
                ts: timestamp,
                embedding_id: req.embedding_id,
                facets,
            };
            
            warp::reply::json(&token)
        });

    let root = warp::path::end()
        .map(|| "I am Sentience service");

    let routes = ping
        .or(healthz)
        .or(tokenize)
        .or(root)
        .with(cors);

    warp::serve(routes)
        .run(([0, 0, 0, 0], 8082))
        .await;
}
