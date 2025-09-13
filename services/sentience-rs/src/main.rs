use sentience::SentienceAgent;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
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

fn escape_dsl(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

#[tokio::main]
async fn main() {
    println!("Sentience service starting on :8082");
    println!("I am Sentience service");

    // Load the Sentience agent from file
    let agent_code = match fs::read_to_string("agent.sentience") {
        Ok(code) => {
            println!("Loaded agent from agent.sentience");
            code
        }
        Err(e) => {
            eprintln!("Failed to read agent.sentience: {}", e);
            eprintln!("Using fallback agent code");
            r#"
agent MultiModalAnalyzer {
    mem short
    goal: "Analyze visual and speech input to extract meaningful insights"
    
    on input(msg) {
        embed msg -> mem.short
        
        // Basic fallback analysis
        if context includes ["hello"] {
            speech_intent = "greeting"
            affect_valence = "0.8"
        }
        if context includes ["you"] {
            speech_intent = "statement"
            affect_valence = "0.5"
        }
    }
}
"#
            .to_string()
        }
    };

    // Register the agent
    if let Ok(mut agent) = SENTIENCE_AGENT.lock() {
        let _ = agent.run_sentience(&agent_code);
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

    let run = warp::path("run")
        .and(warp::post())
        .and(warp::body::json())
        .map(|req: serde_json::Value| {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();

            let mut facets = HashMap::new();

            // Use real Sentience agent to analyze input
            if let Ok(mut agent) = SENTIENCE_AGENT.lock() {
                let context = req["context"].as_str().unwrap_or("");
                let msg = req["msg"].as_str().unwrap_or("");
                let _embedding_id = req["embedding_id"].as_str().unwrap_or("unknown");

                // Send to Sentience agent by executing a DSL snippet that sets memory and invokes `.input`
                let ctx_esc = escape_dsl(context);
                let msg_esc = escape_dsl(msg);
                let dsl = format!(
                    "mem.short[\"context\"] = \"{}\"\nmem.short[\"msg\"] = \"{}\"\n.input {}",
                    ctx_esc, msg_esc, msg_esc
                );
                println!("Sending to Sentience via DSL script:\n{}", dsl);
                let _ = agent.run_sentience(&dsl);

                // Debug: print all memory
                let short_mem = agent.all_short();
                println!("Short memory: {:?}", short_mem);

                // Extract facets from agent's short-term memory
                for (key, value) in short_mem {
                    if key.starts_with("vision")
                        || key.starts_with("speech")
                        || key.starts_with("affect")
                        || key.starts_with("color")
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

            let token = SentienceToken {
                event_type: "sentience.token".to_string(),
                ts: timestamp,
                embedding_id: req["embedding_id"]
                    .as_str()
                    .unwrap_or("unknown")
                    .to_string(),
                facets,
            };

            warp::reply::json(&token)
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
                    // Send only the transcript words, not the "speech:" prefix
                    input_data.push_str(transcript);
                }

                // Send to Sentience agent via DSL script (set context + msg, then `.input`)
                let ctx_esc = escape_dsl(&input_data);
                let msg_esc = escape_dsl(req.transcript.as_deref().unwrap_or(""));
                let dsl = if !msg_esc.is_empty() {
                    format!(
                        "mem.short[\"context\"] = \"{}\"\nmem.short[\"msg\"] = \"{}\"\n.input {}",
                        ctx_esc,
                        msg_esc,
                        msg_esc
                    )
                } else {
                    // If there is no transcript, still set context and use a neutral input trigger
                    format!(
                        "mem.short[\"context\"] = \"{}\"\nmem.short[\"msg\"] = \"\"\n.input context",
                        ctx_esc
                    )
                };
                println!("Sending to Sentience via DSL script:\n{}", dsl);
                let _ = agent.run_sentience(&dsl);

                // Debug: print all memory
                let short_mem = agent.all_short();
                println!("Short memory: {:?}", short_mem);

                // Extract facets from agent's short-term memory
                for (key, value) in short_mem {
                    if key.starts_with("vision")
                        || key.starts_with("speech")
                        || key.starts_with("affect")
                        || key.starts_with("color")
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

    let routes = ping.or(healthz).or(run).or(tokenize).or(root).with(cors);

    warp::serve(routes).run(([0, 0, 0, 0], 8082)).await;
}
