use crate::context::AgentContext;
use crate::types::Statement;

fn eval_expr(expr: &str, input: &str, _ctx: &AgentContext) -> String {
    match expr.trim() {
        "input" | "msg" => input.to_string(),
        _ => expr.trim_matches('"').to_string(),
    }
}

/// Evaluate a single AST statement in the given context.
pub fn eval(
    stmt: &Statement,
    indent: &str,
    input: &str,
    ctx: &mut AgentContext,
    output: &mut Vec<String>,
) {
    match stmt {
        Statement::AgentDeclaration { name, body } => {
            output.push(format!("Agent: {}", name));
            for inner in body.iter() {
                match inner {
                    Statement::MemDeclaration { target } => {
                        output.push(format!("  Init mem: {}", target));
                    }
                    Statement::Goal(text) => {
                        output.push(format!("  Goal: \"{}\"", text));
                    }
                    _ => {}
                }
            }
            ctx.current_agent = Some(stmt.clone());
            output.push(format!("Agent: {} [registered]", name));
        }
        Statement::MemDeclaration { .. } => {}
        Statement::OnInput { param, body } => {
            ctx.set_mem("short", param, input);
            for inner in body.iter() {
                eval(inner, indent, input, ctx, output);
            }
        }
        Statement::Reflect { body } => {
            let nested_indent = format!("{}  ", indent);
            for inner in body.iter() {
                eval(inner, &nested_indent, input, ctx, output);
            }
        }
        Statement::ReflectAccess { mem_target, key } => {
            let val = match mem_target.as_str() {
                "short" => ctx.get_mem("short", key),
                "long" => ctx.get_mem("long", key),
                _ => String::new(),
            };
            ctx.output = Some(val.clone());
            output.push(format!("{}{}", indent, val));
        }
        Statement::Train { .. } => {}
        Statement::Evolve { .. } => {}
        Statement::Goal(_) => {}
        Statement::Embed { .. } => {}
        Statement::IfContextIncludes { values, body } => {
            let current_val = ctx.get_mem("short", "msg");
            for v in values.iter() {
                if current_val.contains(v) {
                    for inner in body.iter() {
                        eval(inner, indent, input, ctx, output);
                    }
                    break;
                }
            }
        }
        Statement::Print(text) => {
            output.push(format!("{}{}", indent, text));
        }
        Statement::Assignment(name, expr) => {
            if name == "output" {
                let val = eval_expr(expr, input, ctx);
                ctx.output = Some(val.clone());
                output.push(val);
                return;
            }

            let val = eval_expr(expr, input, ctx);
            ctx.set_mem("short", name, &val);
        }
        Statement::Unknown(text) => {
            output.push(format!("{}Unknown statement: {}", indent, text));
        }
    }
}
