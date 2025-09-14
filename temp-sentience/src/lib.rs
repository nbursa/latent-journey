pub mod context;
pub mod eval;
pub mod lexer;
pub mod parser;
pub mod types;

use context::AgentContext;
use eval::eval;
use lexer::Lexer;
use parser::Parser;
use std::collections::HashMap;
use types::Statement;

pub struct SentienceAgent {
    ctx: AgentContext,
}

impl SentienceAgent {
    pub fn new() -> Self {
        SentienceAgent {
            ctx: AgentContext::new(),
        }
    }

    pub fn run_sentience(&mut self, code: &str) -> Result<String, String> {
        let full_input = code.trim();
        let mut lexer = Lexer::new(full_input);
        let mut parser = Parser::new(&mut lexer);
        let program = parser.parse_program();
        let mut output = Vec::new();
        for stmt in program.statements {
            eval(&stmt, "", "", &mut self.ctx, &mut output);
        }
        Ok(output.join("\n"))
    }

    pub fn handle_input(&mut self, input: &str) -> Option<String> {
        tracing::info!("handle_input triggered with: {:?}", input);

        let current_agent = self.ctx.current_agent.clone();
        let mut output = Vec::new();

        if let Some(Statement::AgentDeclaration { body, .. }) = current_agent {
            for stmt in body {
                if let Statement::OnInput { body, .. } = stmt {
                    for inner in body {
                        eval(&inner, "", input, &mut self.ctx, &mut output);
                    }
                    tracing::info!("Output after eval: {:?}", self.ctx.output);

                    return Some(output.join("\n"));
                }
            }
        }

        tracing::warn!("No agent or on input block matched.");

        None
    }

    pub fn get_short(&self, key: &str) -> String {
        self.ctx.get_mem("short", key)
    }

    pub fn get_long(&self, key: &str) -> String {
        self.ctx.get_mem("long", key)
    }

    pub fn set_short(&mut self, key: &str, value: &str) {
        self.ctx.set_mem("short", key, value);
    }

    pub fn set_long(&mut self, key: &str, value: &str) {
        self.ctx.set_mem("long", key, value);
    }

    pub fn all_short(&self) -> HashMap<String, String> {
        self.ctx.mem_short.clone()
    }

    pub fn all_long(&self) -> HashMap<String, String> {
        self.ctx.mem_long.clone()
    }
}
