mod context;
mod eval;
mod lexer;
mod parser;
mod types;

use context::AgentContext;
use eval::eval;
use lexer::Lexer;
use parser::Parser;
use std::io::{self, BufRead, Write};
use types::Statement;

fn print_prompt() {
    print!(">>> ");
    io::stdout().flush().unwrap();
}

fn main() {
    println!("Sentience REPL v0.1.1 (Rust)");

    let stdin = io::stdin();
    let mut lines = stdin.lock().lines();
    let mut ctx = AgentContext::new();

    let mut buffer: Vec<String> = Vec::new();
    let mut depth = 0;

    print_prompt();

    while let Some(Ok(line)) = lines.next() {
        let trimmed = line.trim();

        if trimmed.is_empty() && depth == 0 {
            print_prompt();
            continue;
        }

        if depth == 0 && trimmed.starts_with('.') {
            handle_command(trimmed, &mut ctx);
            print_prompt();
            continue;
        }

        depth += trimmed.matches('{').count();
        depth -= trimmed.matches('}').count();
        buffer.push(trimmed.to_string());

        if depth == 0 {
            let full_input = buffer.join(" ");
            let mut lexer = Lexer::new(&full_input);
            let mut parser = Parser::new(&mut lexer);
            let program = parser.parse_program();
            for stmt in program.statements {
                let mut output = Vec::new();
                eval(&stmt, "", "", &mut ctx, &mut output);
                if !output.is_empty() {
                    for line in output {
                        println!("{}", line);
                    }
                }
            }
            buffer.clear();
            print_prompt();
        }
    }
}

fn handle_command(line: &str, ctx: &mut AgentContext) {
    let after_dot = &line[1..];
    let (cmd, rest) = after_dot.split_once(' ').unwrap_or((after_dot, ""));
    let input_value = rest.trim();

    if ctx.current_agent.is_none() {
        println!("No agent registered.");
        return;
    }

    if let Some(Statement::AgentDeclaration { body, .. }) = ctx.current_agent.clone() {
        for stmt in body {
            match (cmd, &stmt) {
                ("input", Statement::OnInput { param, body }) => {
                    ctx.set_mem("short", param, input_value);
                    let mut output = Vec::new();
                    for s in body {
                        eval(s, "  ", input_value, ctx, &mut output);
                    }
                    for line in output {
                        println!("{}", line);
                    }
                    return;
                }

                ("train", Statement::Train { body }) => {
                    ctx.set_mem("short", "msg", input_value);
                    let mut output = Vec::new();
                    for s in body {
                        eval(s, "  ", input_value, ctx, &mut output);
                    }
                    for line in output {
                        println!("{}", line);
                    }
                    return;
                }

                ("evolve", Statement::Evolve { body }) => {
                    ctx.set_mem("short", "msg", input_value);
                    let mut output = Vec::new();
                    for s in body {
                        eval(s, "  ", input_value, ctx, &mut output);
                    }
                    for line in output {
                        println!("{}", line);
                    }
                    return;
                }

                _ => {}
            }
        }
        if cmd == "input" {
            println!("Agent has no on input handler.");
        } else {
            println!("Agent has no {} block.", cmd);
        }
    }
}
