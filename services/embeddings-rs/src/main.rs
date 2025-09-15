use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use warp::Filter;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingData {
    pub id: String,
    pub timestamp: i64,
    pub source: String, // "vision" or "speech"
    pub embedding: Vec<f32>,
    pub facets: HashMap<String, serde_json::Value>,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingStore {
    pub embeddings: HashMap<String, EmbeddingData>,
}

impl EmbeddingStore {
    pub fn new() -> Self {
        Self {
            embeddings: HashMap::new(),
        }
    }

    pub fn add_embedding(&mut self, data: EmbeddingData) {
        self.embeddings.insert(data.id.clone(), data);
    }

    pub fn get_embeddings(&self) -> Vec<&EmbeddingData> {
        self.embeddings.values().collect()
    }

    pub fn get_embeddings_by_source(&self, source: &str) -> Vec<&EmbeddingData> {
        self.embeddings
            .values()
            .filter(|e| e.source == source)
            .collect()
    }
}

type EmbeddingStoreRef = Arc<RwLock<EmbeddingStore>>;

#[tokio::main]
async fn main() {
    println!("Embeddings service starting on :8085");
    println!("I am Embeddings service");

    let store: EmbeddingStoreRef = Arc::new(RwLock::new(EmbeddingStore::new()));

    let cors = warp::cors()
        .allow_any_origin()
        .allow_headers(vec!["content-type"])
        .allow_methods(vec!["GET", "POST", "OPTIONS"]);

    let ping = warp::path("ping").and(warp::get()).map(|| {
        warp::reply::json(&serde_json::json!({
            "message": "I am Embeddings service",
            "service": "embeddings-rs",
            "status": "running"
        }))
    });

    let healthz = warp::path("healthz").and(warp::get()).map(|| {
        use std::time::{SystemTime, UNIX_EPOCH};
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        warp::reply::json(&serde_json::json!({
            "status": "healthy",
            "service": "embeddings-rs",
            "timestamp": timestamp
        }))
    });

    let add_embedding = warp::path("add")
        .and(warp::post())
        .and(warp::body::json())
        .and(with_store(store.clone()))
        .and_then(add_embedding_handler);

    let get_embeddings = warp::path("embeddings")
        .and(warp::get())
        .and(with_store(store.clone()))
        .and_then(get_embeddings_handler);

    let get_embeddings_by_source = warp::path("embeddings")
        .and(warp::path("source"))
        .and(warp::path::param::<String>())
        .and(warp::get())
        .and(with_store(store.clone()))
        .and_then(get_embeddings_by_source_handler);

    let reduce_dimensions = warp::path("reduce-dimensions")
        .and(warp::post())
        .and(warp::body::json())
        .and_then(reduce_dimensions_handler);

    let routes = ping
        .or(healthz)
        .or(add_embedding)
        .or(get_embeddings)
        .or(get_embeddings_by_source)
        .or(reduce_dimensions)
        .with(cors);

    warp::serve(routes).run(([0, 0, 0, 0], 8085)).await;
}

fn with_store(store: EmbeddingStoreRef) -> impl Filter<Extract = (EmbeddingStoreRef,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || store.clone())
}

async fn add_embedding_handler(
    data: EmbeddingData,
    store: EmbeddingStoreRef,
) -> Result<impl warp::Reply, warp::Rejection> {
    let mut store = store.write().unwrap();
    store.add_embedding(data);
    Ok(warp::reply::json(&serde_json::json!({
        "success": true,
        "message": "Embedding added successfully"
    })))
}

async fn get_embeddings_handler(
    store: EmbeddingStoreRef,
) -> Result<impl warp::Reply, warp::Rejection> {
    let store = store.read().unwrap();
    let embeddings = store.get_embeddings();
    Ok(warp::reply::json(&serde_json::json!({
        "embeddings": embeddings,
        "count": embeddings.len()
    })))
}

async fn get_embeddings_by_source_handler(
    source: String,
    store: EmbeddingStoreRef,
) -> Result<impl warp::Reply, warp::Rejection> {
    let store = store.read().unwrap();
    let embeddings = store.get_embeddings_by_source(&source);
    Ok(warp::reply::json(&serde_json::json!({
        "embeddings": embeddings,
        "source": source,
        "count": embeddings.len()
    })))
}

async fn reduce_dimensions_handler(
    data: serde_json::Value,
) -> Result<impl warp::Reply, warp::Rejection> {
    let embeddings = data["embeddings"]
        .as_array()
        .ok_or_else(|| warp::reject::custom(EmbeddingError::InvalidData))?;
    
    let method = data["method"].as_str().unwrap_or("pca");
    let n_components = data["n_components"].as_u64().unwrap_or(3) as usize;

    // Call ML service for dimension reduction
    let client = reqwest::Client::new();
    let ml_response = client
        .post("http://localhost:8081/reduce-dimensions")
        .json(&serde_json::json!({
            "embeddings": embeddings,
            "method": method,
            "n_components": n_components
        }))
        .send()
        .await
        .map_err(|_| warp::reject::custom(EmbeddingError::MLServiceError))?;

    let result: serde_json::Value = ml_response
        .json()
        .await
        .map_err(|_| warp::reject::custom(EmbeddingError::MLServiceError))?;

    Ok(warp::reply::json(&result))
}

#[derive(Debug)]
pub enum EmbeddingError {
    InvalidData,
    MLServiceError,
}

impl warp::reject::Reject for EmbeddingError {}
