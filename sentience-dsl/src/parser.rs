use crate::lexer::{Lexer, Token, TokenType};
use crate::types::{Program, Statement};

pub struct Parser<'a> {
    lexer: &'a mut Lexer<'a>,
    cur_token: Token,
    peek_token: Token,
}

impl<'a> Parser<'a> {
    pub fn new(lexer: &'a mut Lexer<'a>) -> Self {
        let first = lexer.next_token();
        let second = lexer.next_token();
        Parser {
            lexer,
            cur_token: first,
            peek_token: second,
        }
    }

    fn next_token(&mut self) {
        self.cur_token = std::mem::replace(&mut self.peek_token, self.lexer.next_token());
    }

    pub fn parse_program(&mut self) -> Program {
        let mut program = Program {
            statements: Vec::new(),
        };
        while self.cur_token.token_type != TokenType::Eof {
            if let Some(stmt) = self.parse_statement() {
                program.statements.push(stmt);
            }
            self.next_token();
        }
        program
    }

    fn parse_statement(&mut self) -> Option<Statement> {
        match self.cur_token.token_type {
            TokenType::Agent => self.parse_agent(),
            TokenType::Mem => self.parse_mem(),
            TokenType::On => self.parse_on_input(),
            TokenType::Reflect => self.parse_reflect(),
            TokenType::Train => self.parse_train(),
            TokenType::Evolve => self.parse_evolve(),
            TokenType::Goal => self.parse_goal(),
            TokenType::Embed => self.parse_embed(),
            TokenType::If => self.parse_if_context_includes(),
            TokenType::Print => self.parse_print(),
            _ => {
                if self.cur_token.token_type == TokenType::Ident
                    && self.peek_token.token_type == TokenType::Equal
                {
                    let key = self.cur_token.literal.clone();
                    self.next_token();
                    self.next_token();
                    let value = self.cur_token.literal.clone();
                    return Some(Statement::Assignment(key, value));
                }

                Some(Statement::Unknown(self.cur_token.literal.clone()))
            }
        }
    }

    fn parse_agent(&mut self) -> Option<Statement> {
        self.next_token();
        let name = self.cur_token.literal.clone();
        if self.peek_token.token_type != TokenType::LBrace {
            return None;
        }
        self.next_token();
        let mut body = Vec::new();
        self.next_token();
        while self.cur_token.token_type != TokenType::RBrace
            && self.cur_token.token_type != TokenType::Eof
        {
            if let Some(inner) = self.parse_statement() {
                body.push(inner);
            }
            self.next_token();
        }
        Some(Statement::AgentDeclaration { name, body })
    }

    fn parse_mem(&mut self) -> Option<Statement> {
        self.next_token();
        let target = self.cur_token.literal.clone();
        Some(Statement::MemDeclaration { target })
    }

    fn parse_on_input(&mut self) -> Option<Statement> {
        self.next_token();
        if self.cur_token.token_type != TokenType::Input {
            return None;
        }
        self.next_token();
        if self.cur_token.token_type != TokenType::LParen {
            return None;
        }
        self.next_token();
        let param = self.cur_token.literal.clone();
        self.next_token();
        if self.cur_token.token_type != TokenType::RParen {
            return None;
        }
        self.next_token();
        if self.cur_token.token_type != TokenType::LBrace {
            return None;
        }
        let mut body = Vec::new();
        self.next_token();
        while self.cur_token.token_type != TokenType::RBrace
            && self.cur_token.token_type != TokenType::Eof
        {
            if let Some(s) = self.parse_statement() {
                body.push(s);
            }
            self.next_token();
        }
        Some(Statement::OnInput { param, body })
    }

    /// Parse either a full `reflect { ... }` block or a single-line `reflect mem.<target>["<key>"]`.
    fn parse_reflect(&mut self) -> Option<Statement> {
        if self.peek_token.token_type == TokenType::LBrace {
            self.next_token(); // cur_token == LBrace
            self.next_token(); // cur_token == Mem

            if self.cur_token.token_type != TokenType::Mem {
                return None;
            }

            let (mem_target, key) = self.expect_dot_and_bracket()?;
            while self.cur_token.token_type != TokenType::RBrace
                && self.cur_token.token_type != TokenType::Eof
            {
                self.next_token();
            }
            return Some(Statement::Reflect {
                body: vec![Statement::ReflectAccess { mem_target, key }],
            });
        }

        self.next_token();
        if self.cur_token.token_type != TokenType::Mem {
            return None;
        }
        if let Some((mem_target, key)) = self.expect_dot_and_bracket() {
            return Some(Statement::ReflectAccess { mem_target, key });
        }
        None
    }

    fn expect_dot_and_bracket(&mut self) -> Option<(String, String)> {
        self.next_token();
        if self.cur_token.token_type != TokenType::Dot {
            return None;
        }

        self.next_token();
        if self.cur_token.token_type != TokenType::Ident {
            return None;
        }
        let mem_target = self.cur_token.literal.clone();

        self.next_token();
        if self.cur_token.token_type != TokenType::LBracket {
            return None;
        }

        self.next_token();
        if self.cur_token.token_type != TokenType::String {
            return None;
        }
        let key = self.cur_token.literal.clone();

        self.next_token();
        if self.cur_token.token_type != TokenType::RBracket
            && self.cur_token.token_type != TokenType::RBrace
        {
            return None;
        }

        Some((mem_target, key))
    }

    fn parse_train(&mut self) -> Option<Statement> {
        self.next_token();
        if self.cur_token.token_type != TokenType::LBrace {
            return None;
        }
        let mut body = Vec::new();
        self.next_token();
        while self.cur_token.token_type != TokenType::RBrace
            && self.cur_token.token_type != TokenType::Eof
        {
            if let Some(s) = self.parse_statement() {
                body.push(s);
            }
            self.next_token();
        }
        Some(Statement::Train { body })
    }

    fn parse_evolve(&mut self) -> Option<Statement> {
        self.next_token();
        if self.cur_token.token_type != TokenType::LBrace {
            return None;
        }
        let mut body = Vec::new();
        self.next_token();
        while self.cur_token.token_type != TokenType::RBrace
            && self.cur_token.token_type != TokenType::Eof
        {
            if let Some(s) = self.parse_statement() {
                body.push(s);
            }
            self.next_token();
        }
        Some(Statement::Evolve { body })
    }

    fn parse_goal(&mut self) -> Option<Statement> {
        self.next_token();
        if self.cur_token.token_type != TokenType::Colon {
            return None;
        }
        self.next_token();
        if self.cur_token.token_type != TokenType::String {
            return None;
        }
        let value = self.cur_token.literal.clone();
        Some(Statement::Goal(value))
    }

    fn parse_embed(&mut self) -> Option<Statement> {
        self.next_token();
        let source = self.cur_token.literal.clone();
        self.next_token();
        if self.cur_token.token_type != TokenType::Arrow {
            return None;
        }
        self.next_token();
        let mut parts = vec![self.cur_token.literal.clone()];
        self.next_token();
        if self.cur_token.token_type == TokenType::Dot {
            self.next_token();
            parts.push(self.cur_token.literal.clone());
        }
        let target = parts.join(".");
        Some(Statement::Embed { source, target })
    }

    fn parse_if_context_includes(&mut self) -> Option<Statement> {
        self.next_token();
        if self.cur_token.token_type != TokenType::Ident || self.cur_token.literal != "context" {
            return None;
        }
        self.next_token();
        if self.cur_token.token_type != TokenType::Ident || self.cur_token.literal != "includes" {
            return None;
        }
        self.next_token();
        if self.cur_token.token_type != TokenType::LBracket {
            return None;
        }
        let mut values = Vec::new();
        loop {
            self.next_token();
            if self.cur_token.token_type == TokenType::String {
                values.push(self.cur_token.literal.clone());
            } else if self.cur_token.token_type == TokenType::RBracket {
                break;
            } else {
                return None;
            }
        }
        self.next_token();
        if self.cur_token.token_type != TokenType::LBrace {
            return None;
        }
        let mut body = Vec::new();
        self.next_token();
        while self.cur_token.token_type != TokenType::RBrace
            && self.cur_token.token_type != TokenType::Eof
        {
            if let Some(s) = self.parse_statement() {
                body.push(s);
            }
            self.next_token();
        }
        Some(Statement::IfContextIncludes { values, body })
    }

    fn parse_print(&mut self) -> Option<Statement> {
        self.next_token();
        if self.cur_token.token_type != TokenType::String {
            return None;
        }
        let val = self.cur_token.literal.clone();
        Some(Statement::Print(val))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lexer::Lexer;
    use crate::types::Statement;

    #[test]
    fn parse_simple_agent() {
        let input = r#"
            agent Echo {
              mem short
              goal: "Store and reflect"
              on input(msg) {
                embed msg -> mem.short
                reflect { mem.short["msg"] }
              }
              train {
                print "Training"
              }
            }
        "#;
        let mut lexer = Lexer::new(input);
        let mut parser = Parser::new(&mut lexer);
        let program = parser.parse_program();

        assert_eq!(program.statements.len(), 1);
        match &program.statements[0] {
            Statement::AgentDeclaration { name, body } => {
                assert_eq!(name, "Echo");
                assert!(
                    body.iter().any(|s| {
                        matches!(
                            s,
                            Statement::MemDeclaration { target } if target == "short"
                        )
                    }),
                    "expected MemDeclaration {{ target: \"short\" }}"
                );
                assert!(
                    body.iter()
                        .any(|s| { matches!(s, Statement::Goal(g) if g == "Store and reflect") }),
                    "expected Goal(\"Store and reflect\")"
                );
                assert!(
                    body.iter().any(|s| {
                        matches!(
                            s,
                            Statement::OnInput { param, body: _ } if param == "msg"
                        )
                    }),
                    "expected OnInput {{ param: \"msg\" }}"
                );
                assert!(
                    body.iter()
                        .any(|s| matches!(s, Statement::Train { body: _ })),
                    "expected Train {{ body }}"
                );
            }
            _ => panic!("Expected AgentDeclaration"),
        }
    }
}
