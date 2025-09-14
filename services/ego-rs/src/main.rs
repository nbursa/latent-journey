use ego_rs::{
    config::Config,
    handlers,
    memory::MemoryStore,
    reflection::ReflectionEngine,
};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, Level};
use warp::Filter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    let config = Config::default();
    info!("Starting Ego service on port {}", config.port);

    // Initialize memory store and load existing data
    let mut memory_store = MemoryStore::new();
    if let Err(e) = memory_store.load_from_jsonl("../sentience-rs/data/memory.jsonl") {
        tracing::warn!("Failed to load existing memory data: {}", e);
    }
    let memory_store = Arc::new(RwLock::new(memory_store));

    // Initialize reflection engine
    let reflection_engine = Arc::new(ReflectionEngine::new(
        config.ollama_url.clone(),
        config.model.clone(),
    ));

    // Health check endpoint
    let health = warp::path("health")
        .and(warp::get())
        .map(|| warp::reply::json(&serde_json::json!({
            "status": "healthy",
            "service": "ego-rs"
        })));

    // Status endpoint with Ollama check
    let status = warp::path("api")
        .and(warp::path("ego"))
        .and(warp::path("status"))
        .and(warp::get())
        .and(with_reflection_engine(reflection_engine.clone()))
        .and_then(handlers::status);

    // Reflection endpoints
    let reflect = warp::path("api")
        .and(warp::path("ego"))
        .and(
            warp::path("reflect")
                .and(warp::post())
                .and(warp::body::json())
                .and(with_memory_store(memory_store.clone()))
                .and(with_reflection_engine(reflection_engine.clone()))
                .and_then(handlers::reflect),
        );

    // Memory consolidation endpoints
    let consolidate = warp::path("api")
        .and(warp::path("ego"))
        .and(
            warp::path("consolidate")
                .and(warp::post())
                .and(warp::body::json())
                .and(with_memory_store(memory_store.clone()))
                .and_then(handlers::consolidate),
        );

    // Memory query endpoints
    let memories = warp::path("api")
        .and(warp::path("ego"))
        .and(
            warp::path("memories")
                .and(warp::get())
                .and(warp::query())
                .and(with_memory_store(memory_store.clone()))
                .and_then(handlers::get_memories),
        );

    let routes = health
        .or(status)
        .or(reflect)
        .or(consolidate)
        .or(memories)
        .with(warp::cors().allow_any_origin().allow_headers(vec!["content-type"]).allow_methods(vec!["GET", "POST"]));

    info!("Ego service ready");
    warp::serve(routes)
        .run(([0, 0, 0, 0], config.port))
        .await;

    Ok(())
}

fn with_memory_store(
    memory_store: Arc<RwLock<MemoryStore>>,
) -> impl Filter<Extract = (Arc<RwLock<MemoryStore>>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || memory_store.clone())
}

fn with_reflection_engine(
    reflection_engine: Arc<ReflectionEngine>,
) -> impl Filter<Extract = (Arc<ReflectionEngine>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || reflection_engine.clone())
}
