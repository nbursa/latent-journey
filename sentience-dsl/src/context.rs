use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io;

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentContext {
    pub mem_short: HashMap<String, String>,
    pub mem_long: HashMap<String, String>,
    pub links: HashMap<String, String>,

    #[serde(skip)]
    pub current_agent: Option<crate::types::Statement>,

    #[serde(skip)]
    pub output: Option<String>,
}

impl AgentContext {
    pub fn new() -> Self {
        AgentContext {
            mem_short: HashMap::new(),
            mem_long: HashMap::new(),
            links: HashMap::new(),
            current_agent: None,
            output: None,
        }
    }

    pub fn set_mem(&mut self, target: &str, key: &str, value: &str) {
        match target {
            "short" => {
                self.mem_short.insert(key.to_string(), value.to_string());
            }
            "long" => {
                self.mem_long.insert(key.to_string(), value.to_string());
            }
            _ => {}
        }
    }

    pub fn get_mem(&self, target: &str, key: &str) -> String {
        match target {
            "short" => self.mem_short.get(key).cloned().unwrap_or_default(),
            "long" => self.mem_long.get(key).cloned().unwrap_or_default(),
            _ => String::new(),
        }
    }

    #[allow(dead_code)]
    pub fn save(&self, path: &str) -> io::Result<()> {
        let serialized = serde_json::to_string_pretty(self)?;
        fs::write(path, serialized)?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn load(&mut self, path: &str) -> io::Result<()> {
        let content = fs::read_to_string(path)?;
        let loaded: AgentContext = serde_json::from_str(&content)?;
        self.mem_short = loaded.mem_short;
        self.mem_long = loaded.mem_long;
        self.links = loaded.links;
        Ok(())
    }
}
