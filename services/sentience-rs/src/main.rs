use sentience::SentienceAgent;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use warp::Filter;

#[derive(Deserialize)]
struct TokenizeRequest {
    embedding_id: String,
    clip_topk: Option<Vec<ClipItem>>,
    transcript: Option<String>,
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

// Global Sentience agent instance
use std::sync::Arc;
use std::sync::Mutex;

lazy_static::lazy_static! {
    static ref SENTIENCE_AGENT: Arc<Mutex<SentienceAgent>> = Arc::new(Mutex::new(SentienceAgent::new()));
}

#[tokio::main]
async fn main() {
    println!("Sentience service starting on :8082");
    println!("I am Sentience service");

    // Initialize the Sentience agent with multi-modal analysis
    let agent_code = r#"
agent MultiModalAnalyzer {
    mem short
    goal: "Analyze visual and speech input to extract meaningful insights"
    
    on input(msg) {
        embed msg -> mem.short
        
        // Vision analysis
        if context includes ["banana"] {
            vision_object = "banana"
            affect_valence = "0.6"
            affect_arousal = "0.3"
        }
        if context includes ["fruit"] {
            vision_object = "fruit"
            affect_valence = "0.7"
            affect_arousal = "0.4"
        }
        if context includes ["yellow"] {
            color_dominant = "yellow"
            affect_valence = "0.8"
        }
        if context includes ["object"] {
            vision_object = "object"
            affect_valence = "0.5"
        }
        
        // Speech analysis
        if context includes ["hello"] {
            speech_intent = "greeting"
            affect_valence = "0.8"
            affect_arousal = "0.2"
        }
        if context includes ["help"] {
            speech_intent = "request"
            affect_valence = "0.3"
            affect_arousal = "0.7"
        }
        if context includes ["thank"] {
            speech_intent = "gratitude"
            affect_valence = "0.9"
            affect_arousal = "0.1"
        }
        if context includes ["what"] {
            speech_intent = "question"
            affect_valence = "0.4"
            affect_arousal = "0.5"
        }
        if context includes ["good"] {
            speech_sentiment = "positive"
            affect_valence = "0.7"
        }
        if context includes ["bad"] {
            speech_sentiment = "negative"
            affect_valence = "0.2"
        }
    }
}
"#;

    // Register the agent
    if let Ok(mut agent) = SENTIENCE_AGENT.lock() {
        let _ = agent.run_sentience(agent_code);
        println!("MultiModalAnalyzer agent registered");
    }

    let cors = warp::cors()
        .allow_any_origin()
        .allow_headers(vec!["content-type"])
        .allow_methods(vec!["GET", "POST", "OPTIONS"]);

    let ping = warp::path("ping").and(warp::get()).map(|| {
        warp::reply::json(&serde_json::json!({
            "message": "I am Sentience service",
            "service": "sentience-rs",
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

            // Use real Sentience agent to analyze input
            if let Ok(mut agent) = SENTIENCE_AGENT.lock() {
                let mut input_data = String::new();

                // Handle vision input (CLIP results)
                if let Some(clip_topk) = &req.clip_topk {
                    let clip_data = clip_topk
                        .iter()
                        .map(|item| format!("{}:{}", item.label, item.score))
                        .collect::<Vec<_>>()
                        .join(" ");
                    input_data.push_str(&clip_data);
                }

                // Handle speech input (transcript)
                if let Some(transcript) = &req.transcript {
                    if !input_data.is_empty() {
                        input_data.push(' ');
                    }
                    input_data.push_str(transcript);
                }

                // Send to Sentience agent
                println!("Sending to Sentience: {}", input_data);
                if let Some(output) = agent.handle_input(&input_data) {
                    println!("Sentience output: {}", output);
                } else {
                    println!("No output from Sentience agent");
                }

                // Debug: print all memory
                let short_mem = agent.all_short();
                println!("Short memory: {:?}", short_mem);

                // Extract facets from agent's short-term memory
                for (key, value) in short_mem {
                    if key.starts_with("vision.")
                        || key.starts_with("speech.")
                        || key.starts_with("affect.")
                        || key.starts_with("color.")
                    {
                        // Try to parse as number, otherwise keep as string
                        if let Ok(num) = value.parse::<f64>() {
                            facets.insert(
                                key,
                                serde_json::Value::Number(
                                    serde_json::Number::from_f64(num).unwrap(),
                                ),
                            );
                        } else {
                            facets.insert(key, serde_json::Value::String(value));
                        }
                    }
                }
            }

            // Fallback to mock logic if Sentience fails
            if facets.is_empty() {
                // Vision fallback
                if let Some(top_item) = req.clip_topk.as_ref().and_then(|v| v.first()) {
                    facets.insert(
                        "vision.object".to_string(),
                        serde_json::Value::String(top_item.label.clone()),
                    );
                    let valence = top_item.score * 2.0 - 1.0;
                    facets.insert(
                        "affect.valence".to_string(),
                        serde_json::Value::Number(serde_json::Number::from_f64(valence).unwrap()),
                    );
                }
                // Speech fallback
                if let Some(transcript) = &req.transcript {
                    facets.insert(
                        "speech.transcript".to_string(),
                        serde_json::Value::String(transcript.clone()),
                    );
                    facets.insert(
                        "speech.intent".to_string(),
                        serde_json::Value::String("unknown".to_string()),
                    );
                }
            }

            let token = SentienceToken {
                event_type: "sentience.token".to_string(),
                ts: timestamp,
                embedding_id: req.embedding_id,
                facets,
            };

            warp::reply::json(&token)
        });

    let root = warp::path::end().map(|| "I am Sentience service");

    let routes = ping.or(healthz).or(tokenize).or(root).with(cors);

    warp::serve(routes).run(([0, 0, 0, 0], 8082)).await;
}
