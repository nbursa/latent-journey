use ego_rs::{
    config::Config, handlers, memory::MemoryStore, reflection::ReflectionEngine,
    ConsolidationRequest, MemoryQuery,
};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, Level};
use warp::Filter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt().with_max_level(Level::INFO).init();

    let config = Config::default();
    info!("Starting Ego service on port {}", config.port);

    // Initialize memory store and load existing thoughts data
    let mut memory_store = MemoryStore::new_with_path("data/stm.jsonl".to_string());

    // Load existing thoughts from ego-rs STM file
    if let Err(e) = memory_store.load_stm_from_jsonl() {
        tracing::info!("No existing thoughts data found, starting fresh: {}", e);
    }

    // Load existing experiences from ego-rs LTM file
    if let Err(e) = memory_store.load_ltm_from_jsonl() {
        tracing::info!("No existing experiences data found, starting fresh: {}", e);
    }
    let memory_store = Arc::new(RwLock::new(memory_store));

    // Start periodic memory save task
    let memory_store_save = memory_store.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
        loop {
            interval.tick().await;
            if let Err(e) = memory_store_save.read().await.save_all_memories() {
                tracing::error!("Failed to save thoughts periodically: {}", e);
            } else {
                tracing::debug!("Periodically saved all thoughts to file");
            }
        }
    });

    // Initialize reflection engine
    let reflection_engine = Arc::new(ReflectionEngine::new(
        config.ollama_url.clone(),
        config.model.clone(),
    ));

    // Health check endpoint
    let health = warp::path("health").and(warp::get()).map(|| {
        warp::reply::json(&serde_json::json!({
            "status": "healthy",
            "service": "ego-rs"
        }))
    });

    // Status endpoint with Ollama check
    let status = warp::path("api")
        .and(warp::path("ego"))
        .and(warp::path("status"))
        .and(warp::get())
        .and(with_reflection_engine(reflection_engine.clone()))
        .and_then(handlers::status);

    // Reflection endpoints
    let reflect = warp::path("api").and(warp::path("ego")).and(
        warp::path("reflect")
            .and(warp::post())
            .and(warp::body::json())
            .and(with_memory_store(memory_store.clone()))
            .and(with_reflection_engine(reflection_engine.clone()))
            .and_then(handlers::reflect),
    );

    // Memory query endpoints
    let memories = warp::path("api").and(warp::path("ego")).and(
        warp::path("memories")
            .and(warp::get())
            .and(warp::query())
            .and(with_memory_store(memory_store.clone()))
            .and_then(handlers::get_memories),
    );

    // Clear data endpoint
    let clear_data = warp::path("api").and(warp::path("ego")).and(
        warp::path("clear")
            .and(warp::post())
            .and(with_memory_store(memory_store.clone()))
            .and_then(handlers::clear_data),
    );

    // LTM consolidation endpoints
    let consolidate = warp::path("api").and(warp::path("ego")).and(
        warp::path("consolidate")
            .and(warp::post())
            .and(warp::body::json())
            .and(with_memory_store(memory_store.clone()))
            .and(with_reflection_engine(reflection_engine.clone()))
            .and_then(
                |request: ConsolidationRequest,
                 memory_store: Arc<RwLock<MemoryStore>>,
                 reflection_engine: Arc<ReflectionEngine>| {
                    handlers::consolidate_stm_to_ltm(memory_store, reflection_engine, request)
                },
            ),
    );

    let ltm_experiences = warp::path("api").and(warp::path("ego")).and(
        warp::path("experiences")
            .and(warp::get())
            .and(warp::query())
            .and(with_memory_store(memory_store.clone()))
            .and_then(
                |query: MemoryQuery, memory_store: Arc<RwLock<MemoryStore>>| {
                    handlers::get_ltm_experiences(memory_store, query)
                },
            ),
    );

    let ltm_experience = warp::path("api").and(warp::path("ego")).and(
        warp::path("experiences")
            .and(warp::path!(String))
            .and(warp::get())
            .and(with_memory_store(memory_store.clone()))
            .and_then(|id: String, memory_store: Arc<RwLock<MemoryStore>>| {
                handlers::get_ltm_experience(id, memory_store)
            }),
    );

    let clear_ltm = warp::path("api").and(warp::path("ego")).and(
        warp::path("clear-ltm")
            .and(warp::post())
            .and(with_memory_store(memory_store.clone()))
            .and_then(handlers::clear_ltm_data),
    );

    let routes = health
        .or(status)
        .or(reflect)
        .or(memories)
        .or(clear_data)
        .or(consolidate)
        .or(ltm_experiences)
        .or(ltm_experience)
        .or(clear_ltm)
        .with(
            warp::cors()
                .allow_any_origin()
                .allow_headers(vec!["content-type"])
                .allow_methods(vec!["GET", "POST"]),
        );

    info!("Ego service ready");
    warp::serve(routes).run(([0, 0, 0, 0], config.port)).await;

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
