use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub port: u16,
    pub ollama_url: String,
    pub model: String,
    pub temperature: f32,
    pub top_p: f32,
    pub max_memories: usize,
    pub time_window_minutes: u64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            port: 8084,
            ollama_url: "http://localhost:11434".to_string(),
            model: "llama3.2:3b".to_string(),
            temperature: 0.2,
            top_p: 0.9,
            max_memories: 24,
            time_window_minutes: 20,
        }
    }
}
