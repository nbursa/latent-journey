#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TokenType {
    Illegal,
    Eof,
    Ident,
    String,
    Arrow,
    LParen,
    RParen,
    LBrace,
    RBrace,
    Dot,
    Colon,
    LBracket,
    RBracket,
    Agent,
    Mem,
    On,
    Goal,
    Reflect,
    Train,
    If,
    Enter,
    Embed,
    Link,
    Input,
    Print,
    Evolve,
    LinkArrow,
    Equal,
}

#[derive(Clone, Debug)]
pub struct Token {
    pub token_type: TokenType,
    pub literal: String,
}

impl Token {
    pub fn new(token_type: TokenType, literal: &str) -> Self {
        Token {
            token_type,
            literal: literal.to_string(),
        }
    }
}

pub struct Lexer<'a> {
    input: &'a str,
    position: usize,
    read_position: usize,
    ch: Option<char>,
}

impl<'a> Lexer<'a> {
    pub fn new(input: &'a str) -> Self {
        let mut l = Lexer {
            input,
            position: 0,
            read_position: 0,
            ch: None,
        };
        l.read_char();
        l
    }

    fn read_char(&mut self) {
        if self.read_position >= self.input.len() {
            self.ch = None;
        } else {
            self.ch = self.input[self.read_position..].chars().next();
        }
        self.position = self.read_position;
        if let Some(c) = self.ch {
            self.read_position += c.len_utf8();
        }
    }

    fn peek_char(&self) -> Option<char> {
        if self.read_position >= self.input.len() {
            None
        } else {
            self.input[self.read_position..].chars().next()
        }
    }

    pub fn next_token(&mut self) -> Token {
        self.skip_whitespace();
        let tok = match self.ch {
            // Some('=') => Token::new(TokenType::Assign, "="),
            Some('=') => Token::new(TokenType::Equal, "="),
            Some('(') => Token::new(TokenType::LParen, "("),
            Some(')') => Token::new(TokenType::RParen, ")"),
            Some('{') => Token::new(TokenType::LBrace, "{"),
            Some('}') => Token::new(TokenType::RBrace, "}"),
            Some('.') => Token::new(TokenType::Dot, "."),
            Some(':') => Token::new(TokenType::Colon, ":"),
            Some('[') => Token::new(TokenType::LBracket, "["),
            Some(']') => Token::new(TokenType::RBracket, "]"),
            Some('-') => {
                if let Some('>') = self.peek_char() {
                    self.read_char();
                    Token::new(TokenType::Arrow, "->")
                } else {
                    Token::new(TokenType::Illegal, &self.ch.unwrap().to_string())
                }
            }
            Some('<') => {
                if let Some('-') = self.peek_char() {
                    let second = self.peek_char();
                    if let Some('-') = second {
                        let ahead = self.input[self.read_position + 1..].chars().next();
                        if let Some('>') = ahead {
                            self.read_char();
                            self.read_char();
                            self.read_char();
                            Token::new(TokenType::LinkArrow, "<->")
                        } else {
                            Token::new(TokenType::Illegal, &self.ch.unwrap().to_string())
                        }
                    } else {
                        Token::new(TokenType::Illegal, &self.ch.unwrap().to_string())
                    }
                } else {
                    Token::new(TokenType::Illegal, &self.ch.unwrap().to_string())
                }
            }
            Some('"') => {
                let literal = self.read_string();
                Token::new(TokenType::String, &literal)
            }
            None => Token::new(TokenType::Eof, ""),
            Some(c) => {
                if is_letter(c) {
                    let literal = self.read_identifier();
                    let token_type = lookup_ident(&literal);
                    return Token::new(token_type, &literal);
                } else if c.is_ascii_digit() {
                    let literal = self.read_number();
                    return Token::new(TokenType::String, &literal);
                } else {
                    Token::new(TokenType::Illegal, &c.to_string())
                }
            }
        };
        self.read_char();
        tok
    }

    fn skip_whitespace(&mut self) {
        while let Some(c) = self.ch {
            if c == ' ' || c == '\t' || c == '\n' || c == '\r' {
                self.read_char();
            } else {
                break;
            }
        }
    }

    fn read_identifier(&mut self) -> String {
        let position = self.position;
        while let Some(c) = self.ch {
            if is_letter(c) || c.is_ascii_digit() || c == '_' {
                self.read_char();
            } else {
                break;
            }
        }
        self.input[position..self.position].to_string()
    }

    fn read_number(&mut self) -> String {
        let position = self.position;
        while let Some(c) = self.ch {
            if c.is_ascii_digit() {
                self.read_char();
            } else {
                break;
            }
        }
        self.input[position..self.position].to_string()
    }

    fn read_string(&mut self) -> String {
        self.read_char();
        let start = self.position;
        while let Some(c) = self.ch {
            if c == '"' {
                break;
            }
            self.read_char();
        }
        let literal = self.input[start..self.position].to_string();
        self.read_char();
        literal
    }
}

fn is_letter(c: char) -> bool {
    c.is_ascii_alphabetic() || c == '_'
}

fn lookup_ident(ident: &str) -> TokenType {
    match ident {
        "agent" => TokenType::Agent,
        "mem" => TokenType::Mem,
        "on" => TokenType::On,
        "goal" => TokenType::Goal,
        "reflect" => TokenType::Reflect,
        "train" => TokenType::Train,
        "if" => TokenType::If,
        "enter" => TokenType::Enter,
        "embed" => TokenType::Embed,
        "link" => TokenType::Link,
        "input" => TokenType::Input,
        "print" => TokenType::Print,
        "evolve" => TokenType::Evolve,
        _ => TokenType::Ident,
    }
}
