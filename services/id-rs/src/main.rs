use sentience::SentienceAgent;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::fs;
use std::io::Write;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use warp::Filter;

// Helper functions for speech affect analysis
fn analyze_speech_valence(transcript: &str) -> f64 {
    let lower = transcript.to_lowercase();
    
    // Positive words increase valence
    let positive_words = ["happy", "good", "great", "awesome", "amazing", "wonderful", "excellent", "fantastic", "love", "like", "enjoy", "pleased", "excited", "thrilled", "delighted"];
    let negative_words = ["sad", "bad", "terrible", "awful", "hate", "dislike", "angry", "mad", "frustrated", "disappointed", "upset", "worried", "scared", "afraid"];
    
    let mut valence: f64 = 0.5; // neutral starting point
    
    for word in &positive_words {
        if lower.contains(word) {
            valence += 0.1;
        }
    }
    
    for word in &negative_words {
        if lower.contains(word) {
            valence -= 0.1;
        }
    }
    
    // Clamp between 0.0 and 1.0
    valence.max(0.0_f64).min(1.0_f64)
}

fn analyze_speech_arousal(transcript: &str) -> f64 {
    let lower = transcript.to_lowercase();
    
    // High arousal words
    let high_arousal_words = ["excited", "thrilled", "amazing", "incredible", "wow", "oh my", "holy", "intense", "crazy", "wild", "furious", "angry", "scared", "terrified", "shocked", "surprised"];
    let low_arousal_words = ["calm", "peaceful", "quiet", "relaxed", "bored", "tired", "sleepy", "slow", "gentle", "soft", "mellow", "chill"];
    
    let mut arousal: f64 = 0.5; // neutral starting point
    
    for word in &high_arousal_words {
        if lower.contains(word) {
            arousal += 0.15;
        }
    }
    
    for word in &low_arousal_words {
        if lower.contains(word) {
            arousal -= 0.15;
        }
    }
    
    // Check for exclamation marks and caps (indicators of high arousal)
    if lower.contains('!') || transcript.chars().any(|c| c.is_uppercase()) {
        arousal += 0.1;
    }
    
    // Clamp between 0.0 and 1.0
    arousal.max(0.0).min(1.0)
}

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

#[derive(Serialize, Deserialize, Clone)]
struct MemoryEvent {
    ts: u64,
    embedding_id: String,
    embedding: Vec<f64>,
    facets: HashMap<String, serde_json::Value>,
    source: String, // "vision" or "speech"
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

lazy_static::lazy_static! {
    static ref SENTIENCE_AGENT: Arc<Mutex<SentienceAgent>> = Arc::new(Mutex::new(SentienceAgent::new()));
    static ref MEMORY_STORE: Arc<Mutex<VecDeque<MemoryEvent>>> = Arc::new(Mutex::new(VecDeque::with_capacity(500)));
}

fn escape_dsl(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

fn add_to_memory(event: MemoryEvent) {
    if let Ok(mut memory) = MEMORY_STORE.lock() {
        // Add to ring buffer
        if memory.len() >= 500 {
            memory.pop_front();
        }
        memory.push_back(event.clone());
        
        // Persist to JSONL file
        if let Ok(mut file) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open("data/memory.jsonl")
        {
            if let Ok(json) = serde_json::to_string(&event) {
                let _ = writeln!(file, "{}", json);
            }
        }
    }
}

fn load_memory_from_file() {
    if let Ok(content) = std::fs::read_to_string("data/memory.jsonl") {
        if let Ok(mut memory) = MEMORY_STORE.lock() {
            for line in content.lines() {
                if let Ok(event) = serde_json::from_str::<MemoryEvent>(line) {
                    if memory.len() >= 500 {
                        memory.pop_front();
                    }
                    memory.push_back(event);
                }
            }
        }
    }
}

#[tokio::main]
async fn main() {
    println!("Sentience service starting on :8082");
    println!("I am Sentience service");

    // Create data directory if it doesn't exist
    let _ = std::fs::create_dir_all("data");

    // Load memory from file
    load_memory_from_file();
    println!("Loaded memory from data/memory.jsonl");

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
        mem.short["debug.writer_ran"] = "1"
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
        println!("Sentience agent registered from agent.sentience");
    }

    let cors = warp::cors()
        .allow_any_origin()
        .allow_headers(vec!["content-type"])
        .allow_methods(vec!["GET", "POST", "OPTIONS"]);

    let ping = warp::path("ping").and(warp::get()).map(|| {
        warp::reply::json(&serde_json::json!({
            "message": "I am Sentience service",
            "service": "id-rs",
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
            "service": "id-rs",
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

            // ---- Prefill facets from incoming JSON so UI always shows something,
            // even if the DSL agent doesn't persist mem.short correctly.
            if let Some(t) = req.get("transcript").and_then(|v| v.as_str()) {
                facets.insert(
                    "speech.transcript".into(),
                    serde_json::Value::String(t.to_string()),
                );

                // Lightweight intent/sentiment heuristics
                let lower = t.to_lowercase();
                let mut intent = "statement";
                let mut sentiment = "neutral";
                if !t.is_empty() {
                    if lower.contains('?')
                        || lower.starts_with("what ")
                        || lower.starts_with("who ")
                        || lower.starts_with("why ")
                        || lower.starts_with("how ")
                        || lower.starts_with("when ")
                        || lower.starts_with("where ")
                    {
                        intent = "question";
                    } else if lower.starts_with("hello") || lower.starts_with("hi") {
                        intent = "greeting";
                    }
                    // very rough sentiment seed
                    if lower.contains("bad") || lower.contains("terrible") {
                        sentiment = "negative";
                    } else if lower.contains("good")
                        || lower.contains("great")
                        || lower.contains("awesome")
                    {
                        sentiment = "positive";
                    }
                }
                facets.insert(
                    "speech.intent".into(),
                    serde_json::Value::String(intent.to_string()),
                );
                facets.insert(
                    "speech.sentiment".into(),
                    serde_json::Value::String(sentiment.to_string()),
                );
            }

            // Vision data (if present)
            if let Some(vision_obj) = req.get("vision_object").and_then(|v| v.as_str()) {
                if !vision_obj.is_empty() {
                    facets.insert("vision.object".into(), serde_json::Value::String(vision_obj.to_string()));
                }
            }
            if let Some(vision_col) = req.get("vision_color").and_then(|v| v.as_str()) {
                if !vision_col.is_empty() {
                    facets.insert("color.dominant".into(), serde_json::Value::String(vision_col.to_string()));
                }
            }

            // Use real affect data from CLIP if available, otherwise analyze speech for affect
            if let Some(valence) = req.get("affect_valence").and_then(|v| v.as_f64()) {
                facets.insert("affect.valence".into(), serde_json::json!(valence));
            } else if !facets.contains_key("affect.valence") {
                // Analyze speech transcript for affect if no CLIP data
                let transcript = req.get("transcript").and_then(|v| v.as_str()).unwrap_or("");
                let valence = analyze_speech_valence(transcript);
                facets.insert("affect.valence".into(), serde_json::json!(valence));
            }
            
            if let Some(arousal) = req.get("affect_arousal").and_then(|v| v.as_f64()) {
                facets.insert("affect.arousal".into(), serde_json::json!(arousal));
            } else if !facets.contains_key("affect.arousal") {
                // Analyze speech transcript for affect if no CLIP data
                let transcript = req.get("transcript").and_then(|v| v.as_str()).unwrap_or("");
                let arousal = analyze_speech_arousal(transcript);
                facets.insert("affect.arousal".into(), serde_json::json!(arousal));
            }

            // Use real Sentience agent to analyze input
            if let Ok(mut agent) = SENTIENCE_AGENT.lock() {
                // Map incoming JSON to percept.* keys expected by the agent.
                let transcript = req["transcript"].as_str().unwrap_or("");
                let embedding_id = req["embedding_id"].as_str().unwrap_or("unknown");
                let ctx = req["context"].as_str().unwrap_or("");

                let t_esc = escape_dsl(transcript);
                let ctx_esc = escape_dsl(ctx);

                // Extremely lightweight intent/sentiment defaults (gateway may overwrite later).
                let mut intent = "statement";
                let sentiment = "neutral";
                if !transcript.is_empty() {
                    let lower = transcript.to_lowercase();
                    if lower.contains('?')
                        || lower.starts_with("what ")
                        || lower.starts_with("who ")
                        || lower.starts_with("why ")
                        || lower.starts_with("how ")
                        || lower.starts_with("when ")
                        || lower.starts_with("where ")
                    {
                        intent = "question";
                    } else if lower.starts_with("hello") || lower.starts_with("hi") {
                        intent = "greeting";
                    }
                }

                // Check if we have vision data
                let vision_object = req.get("vision_object").and_then(|v| v.as_str()).unwrap_or("");
                let vision_color = req.get("vision_color").and_then(|v| v.as_str()).unwrap_or("");
                
                let dsl = if !transcript.is_empty() {
                    // Speech + Vision
                    let vision_obj_line = if !vision_object.is_empty() {
                        format!("mem.short[\"percept.vision.object\"] = \"{}\"\n", escape_dsl(vision_object))
                    } else { String::new() };
                    let vision_col_line = if !vision_color.is_empty() {
                        format!("mem.short[\"percept.vision.color\"] = \"{}\"\n", escape_dsl(vision_color))
                    } else { String::new() };
                    
                    format!(
                        ".use \"MultiModalWriter\"\n\
                         mem.short[\"percept.context\"] = \"{ctx}\"\n\
                         {vision_obj}{vision_col}mem.short[\"percept.speech.transcript\"] = \"{t}\"\n\
                         mem.short[\"percept.speech.intent\"] = \"{intent}\"\n\
                         mem.short[\"percept.speech.sentiment\"] = \"{sentiment}\"\n\
                         mem.short[\"percept.affect.valence\"] = 0.5\n\
                         mem.short[\"percept.affect.arousal\"] = 0.3\n\
                         mem.short[\"percept.vision.embedding_id\"] = \"{emb}\"\n\
                         .input \"tick\"",
                        ctx = ctx_esc,
                        vision_obj = vision_obj_line,
                        vision_col = vision_col_line,
                        t = t_esc,
                        intent = intent,
                        sentiment = sentiment,
                        emb = escape_dsl(embedding_id),
                    )
                } else {
                    // Vision only
                    let vision_obj_line = if !vision_object.is_empty() {
                        format!("mem.short[\"percept.vision.object\"] = \"{}\"\n", escape_dsl(vision_object))
                    } else { String::new() };
                    let vision_col_line = if !vision_color.is_empty() {
                        format!("mem.short[\"percept.vision.color\"] = \"{}\"\n", escape_dsl(vision_color))
                    } else { String::new() };
                    
                    format!(
                        ".use \"MultiModalWriter\"\n\
                         mem.short[\"percept.context\"] = \"{ctx}\"\n\
                         {vision_obj}{vision_col}mem.short[\"percept.affect.valence\"] = 0.5\n\
                         mem.short[\"percept.affect.arousal\"] = 0.3\n\
                         mem.short[\"percept.vision.embedding_id\"] = \"{emb}\"\n\
                         .input \"tick\"",
                        ctx = ctx_esc,
                        vision_obj = vision_obj_line,
                        vision_col = vision_col_line,
                        emb = escape_dsl(embedding_id),
                    )
                };
                println!("Sending to Sentience via DSL script:\n{}", dsl);
                let _ = agent.run_sentience(&dsl);

                // Debug: print all memory
                let short_mem = agent.all_short();
                println!("Short memory: {:?}", short_mem);

                // Extract facets from agent's short-term memory
                for (key, value) in short_mem.clone() {
                    if key.starts_with("facets.") {
                        let facet_key = key.strip_prefix("facets.").unwrap_or(&key);
                        if let Ok(num) = value.parse::<f64>() {
                            facets.insert(
                                facet_key.to_string(),
                                serde_json::Value::Number(
                                    serde_json::Number::from_f64(num).unwrap(),
                                ),
                            );
                        } else {
                            facets.insert(facet_key.to_string(), serde_json::Value::String(value));
                        }
                    }
                }

                // Note: facets.* keys are already processed above

                // Fallback/augment: map any remaining percept.* keys the agent left in memory
                {
                    if let Some(obj) = short_mem.get("percept.vision.object") {
                        facets
                            .entry("vision.object".into())
                            .or_insert_with(|| serde_json::Value::String(obj.clone()));
                    }
                    if let Some(col) = short_mem.get("percept.vision.color") {
                        facets
                            .entry("color.dominant".into())
                            .or_insert_with(|| serde_json::Value::String(col.clone()));
                    }
                    if let Some(tr) = short_mem.get("percept.speech.transcript") {
                        facets
                            .entry("speech.transcript".into())
                            .or_insert_with(|| serde_json::Value::String(tr.clone()));
                    }
                    if let Some(inten) = short_mem.get("percept.speech.intent") {
                        facets
                            .entry("speech.intent".into())
                            .or_insert_with(|| serde_json::Value::String(inten.clone()));
                    }
                    if let Some(sent) = short_mem.get("percept.speech.sentiment") {
                        facets
                            .entry("speech.sentiment".into())
                            .or_insert_with(|| serde_json::Value::String(sent.clone()));
                    }
                    if let Some(v) = short_mem.get("percept.affect.valence") {
                        if let Ok(num) = v.parse::<f64>() {
                            facets
                                .entry("affect.valence".into())
                                .or_insert(serde_json::json!(num));
                        }
                    }
                    if let Some(a) = short_mem.get("percept.affect.arousal") {
                        if let Ok(num) = a.parse::<f64>() {
                            facets
                                .entry("affect.arousal".into())
                                .or_insert(serde_json::json!(num));
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
                facets: facets.clone(),
            };

            // Determine source type based on input
            let source = if req.get("transcript").and_then(|v| v.as_str()).map_or(false, |s| !s.is_empty()) {
                "speech"
            } else {
                "vision"
            };

            // Add to memory
            let embedding = req.get("embedding")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_f64()).collect())
                .unwrap_or_default();
            
            let memory_event = MemoryEvent {
                ts: timestamp,
                embedding_id: token.embedding_id.clone(),
                embedding: embedding,
                facets: facets,
                source: source.to_string(),
            };
            add_to_memory(memory_event);

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
                // Build a DSL snippet that seeds percept.* keys the agent expects.
                // Vision (pick top-1 label if present)
                let mut top_label: Option<String> = None;
                if let Some(clip_topk) = &req.clip_topk {
                    if let Some(first) = clip_topk.first() {
                        top_label = Some(first.label.clone());
                    }
                }

                // Heuristic color from label (demo only)
                let color = match top_label.as_deref() {
                    Some("banana") => "yellow",
                    Some("apple")  => "red",
                    _ => "unknown",
                };

                let t = req.transcript.as_deref().unwrap_or("");
                let t_esc = escape_dsl(t);
                let emb_esc = escape_dsl(&req.embedding_id);

                // Tiny default intent/sentiment; upstream can get smarter later.
                let lower = t.to_lowercase();
                let mut intent = "statement";
                let sentiment = "neutral";
                if !t.is_empty() {
                    if lower.contains('?') || lower.starts_with("what ") || lower.starts_with("who ")
                        || lower.starts_with("why ") || lower.starts_with("how ")
                        || lower.starts_with("when ") || lower.starts_with("where ") {
                        intent = "question";
                    } else if lower.starts_with("hello") || lower.starts_with("hi") {
                        intent = "greeting";
                    }
                }

                let dsl = format!(
                    ".use \"MultiModalWriter\"\n\
                     {vision_obj}{vision_color}mem.short[\"percept.vision.embedding_id\"] = \"{emb}\"\n\
                     mem.short[\"percept.speech.transcript\"] = \"{t}\"\n\
                     mem.short[\"percept.speech.intent\"] = \"{intent}\"\n\
                     mem.short[\"percept.speech.sentiment\"] = \"{sentiment}\"\n\
                     mem.short[\"percept.affect.valence\"] = 0.5\n\
                     mem.short[\"percept.affect.arousal\"] = 0.3\n\
                     .input \"tick\"",
                    emb = emb_esc,
                    t = t_esc,
                    intent = intent,
                    sentiment = sentiment,
                    vision_obj = if let Some(lbl) = &top_label {
                        format!("mem.short[\"percept.vision.object\"] = \"{}\"\n", escape_dsl(lbl))
                    } else { String::new() },
                    vision_color = if top_label.is_some() {
                        format!("mem.short[\"percept.vision.color\"] = \"{}\"\n", color)
                    } else { String::new() },
                );

                println!("Sending to Sentience via DSL script:\n{}", dsl);
                let _ = agent.run_sentience(&dsl);

                // Debug: print all memory
                let short_mem = agent.all_short();
                println!("Short memory: {:?}", short_mem);

                // Extract facets from agent's short-term memory
                for (key, value) in short_mem.clone() {
                    if key.starts_with("vision")
                        || key.starts_with("speech")
                        || key.starts_with("affect")
                        || key.starts_with("color")
                    {
                        if let Ok(num) = value.parse::<f64>() {
                            facets.insert(
                                key,
                                serde_json::Value::Number(serde_json::Number::from_f64(num).unwrap()),
                            );
                        } else {
                            facets.insert(key, serde_json::Value::String(value));
                        }
                    }
                }

                // Merge explicit facets.* keys written by the agent
                for (k, v) in short_mem.iter() {
                    if let Some(stripped) = k.strip_prefix("facets.") {
                        if let Ok(num) = v.parse::<f64>() {
                            facets.insert(stripped.to_string(), serde_json::json!(num));
                        } else {
                            facets.insert(stripped.to_string(), serde_json::Value::String(v.clone()));
                        }
                    }
                }

                // Fallback/augment: map any remaining percept.* keys the agent left in memory
                {
                    if let Some(obj) = short_mem.get("percept.vision.object") {
                        facets.entry("vision.object".into()).or_insert_with(|| serde_json::Value::String(obj.clone()));
                    }
                    if let Some(col) = short_mem.get("percept.vision.color") {
                        facets.entry("color.dominant".into()).or_insert_with(|| serde_json::Value::String(col.clone()));
                    }
                    if let Some(tr) = short_mem.get("percept.speech.transcript") {
                        facets.entry("speech.transcript".into()).or_insert_with(|| serde_json::Value::String(tr.clone()));
                    }
                    if let Some(inten) = short_mem.get("percept.speech.intent") {
                        facets.entry("speech.intent".into()).or_insert_with(|| serde_json::Value::String(inten.clone()));
                    }
                    if let Some(sent) = short_mem.get("percept.speech.sentiment") {
                        facets.entry("speech.sentiment".into()).or_insert_with(|| serde_json::Value::String(sent.clone()));
                    }
                    if let Some(v) = short_mem.get("percept.affect.valence") {
                        if let Ok(num) = v.parse::<f64>() {
                            facets.entry("affect.valence".into()).or_insert(serde_json::json!(num));
                        }
                    }
                    if let Some(a) = short_mem.get("percept.affect.arousal") {
                        if let Ok(num) = a.parse::<f64>() {
                            facets.entry("affect.arousal".into()).or_insert(serde_json::json!(num));
                        }
                    }
                }
            }

            // Ensure we always have something meaningful for the UI (augment, don't overwrite)
            {
                // Vision
                if let Some(top_item) = req.clip_topk.as_ref().and_then(|v| v.first()) {
                    facets.entry("vision.object".to_string())
                        .or_insert_with(|| serde_json::Value::String(top_item.label.clone()));
                    let valence = top_item.score * 2.0 - 1.0;
                    facets.entry("affect.valence".to_string())
                        .or_insert_with(|| serde_json::Value::Number(serde_json::Number::from_f64(valence).unwrap()));
                }
                // Speech (if provided in this endpoint)
                if let Some(transcript) = &req.transcript {
                    facets.entry("speech.transcript".to_string())
                        .or_insert_with(|| serde_json::Value::String(transcript.clone()));
                    facets.entry("speech.intent".to_string())
                        .or_insert_with(|| serde_json::Value::String("unknown".to_string()));
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

    let memory = warp::path("memory")
        .and(warp::get())
        .and(warp::query::<HashMap<String, String>>())
        .map(|params: HashMap<String, String>| {
            let limit = params.get("limit")
                .and_then(|s| s.parse::<usize>().ok())
                .unwrap_or(200);
            let since_ts = params.get("since_ts")
                .and_then(|s| s.parse::<u64>().ok());

            if let Ok(memory) = MEMORY_STORE.lock() {
                let mut events: Vec<&MemoryEvent> = memory.iter().collect();
                
                // Filter by timestamp if provided
                if let Some(since) = since_ts {
                    events.retain(|e| e.ts >= since);
                }
                
                // Sort by timestamp (newest first)
                events.sort_by(|a, b| b.ts.cmp(&a.ts));
                
                // Apply limit
                events.truncate(limit);
                
                warp::reply::json(&events)
            } else {
                warp::reply::json(&Vec::<&MemoryEvent>::new())
            }
        });

    let memory_stream = warp::path("memory")
        .and(warp::path("stream"))
        .and(warp::get())
        .map(|| {
            // For now, return a simple SSE stream
            // In a real implementation, this would be a proper SSE stream
            warp::reply::with_header(
                "data: {\"type\":\"memory.stream\",\"message\":\"Memory stream started\"}\n\n",
                "content-type",
                "text/event-stream"
            )
        });

    let root = warp::path::end().map(|| "I am Sentience service");

    let routes = ping.or(healthz).or(run).or(tokenize).or(memory).or(memory_stream).or(root).with(cors);

    warp::serve(routes).run(([0, 0, 0, 0], 8082)).await;
}
