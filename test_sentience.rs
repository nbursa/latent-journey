use sentience::SentienceAgent;

fn main() {
    let mut agent = SentienceAgent::new();
    
    // Test simple agent
    let agent_code = r#"
agent TestAgent {
    mem short
    goal: "Test agent"
    
    on input(msg) {
        embed msg -> mem.short
        print "Received input"
    }
}
"#;
    
    println!("Registering agent...");
    let result = agent.run_sentience(agent_code);
    println!("Agent registration result: {:?}", result);
    
    println!("Testing input...");
    let output = agent.handle_input("hello world");
    println!("Output: {:?}", output);
    
    println!("Short memory: {:?}", agent.all_short());
}
