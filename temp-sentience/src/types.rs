#[derive(Clone, Debug, PartialEq)]
pub struct Program {
    pub statements: Vec<Statement>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum Statement {
    AgentDeclaration {
        name: String,
        body: Vec<Statement>,
    },
    MemDeclaration {
        target: String,
    },
    OnInput {
        param: String,
        body: Vec<Statement>,
    },
    Reflect {
        body: Vec<Statement>,
    },
    ReflectAccess {
        mem_target: String,
        key: String,
    },
    Train {
        body: Vec<Statement>,
    },
    Evolve {
        body: Vec<Statement>,
    },
    Goal(String),
    Embed {
        source: String,
        target: String,
    },
    IfContextIncludes {
        values: Vec<String>,
        body: Vec<Statement>,
    },
    Print(String),
    Assignment(String, String),
    Unknown(String),
}
