# 8_SENTIENCE_DSL

> Sentience DSL: A Memory-First Programming Language for AI Agent Development

## Overview

Sentience is an experimental, AI-native programming language designed for building synthetic agents with emergent intelligence. It features a memory-first architecture, agent-based programming model, and contextual conditions that enable rapid prototyping of AI behavior and introspection.

**Source Repository**: [https://github.com/nbursa/sentience](https://github.com/nbursa/sentience)

## Core Philosophy

- **Memory-First Architecture**: All agent knowledge is stored via simple key-value maps
- **Agent-Based Programming**: Define agents with goals, input handlers, and reflection capabilities
- **Contextual Conditions**: Execute code based on memory content and context
- **Emergent Intelligence**: Designed for exploring synthetic awareness and adaptation

## Language Features

### 1. Agent Declaration

```sentience
agent AgentName {
  mem short
  goal: "Agent's primary objective"
  
  on input(param) {
    // Handle input processing
  }
  
  reflect {
    // Self-reflection and introspection
  }
}
```

### 2. Memory System

#### Short-Term Memory (`mem.short`)

- **Purpose**: Temporary storage for recent perceptions and processing
- **Access**: `mem.short["key"] = "value"`
- **Retrieval**: `mem.short["key"]`
- **Scope**: Agent-specific, session-based

#### Long-Term Memory (`mem.long`)

- **Purpose**: Persistent storage for learned concepts and experiences
- **Access**: `mem.long["key"] = "value"`
- **Retrieval**: `mem.long["key"]`
- **Scope**: Agent-specific, persistent across sessions

### 3. Input Handling

```sentience
on input(msg) {
  // Process incoming messages
  mem.short["input"] = msg
  // Additional processing...
}
```

### 4. Reflection System

```sentience
reflect {
  // Self-reflection and introspection
  if context includes "keyword" {
    // Conditional reflection based on memory content
  }
}
```

### 5. Contextual Conditions

```sentience
if context includes "some_string" {
  // Execute only when short-term memory contains substring
}
```

### 6. Memory Operations

```sentience
// Set memory values
mem.short["percept.vision.object"] = "cat"
mem.long["learned.concept"] = "feline"

// Check if memory key exists
if defined mem.short["percept.vision.object"] {
  // Process vision data
}

// Embed data into memory
embed "source_data" -> mem.short
```

## Real-World Implementation

### MultiModalWriter Agent

The following agent is actively used in the Latent Journey system for processing multimodal AI perception:

```sentience
agent MultiModalWriter {
  mem short
  goal: "Project percept.* keys into facets.* keys for the UI"

  on input(_) {
    // Vision processing
    if defined mem.short["percept.vision.object"] {
      mem.short["facets.vision.object"] = mem.short["percept.vision.object"]
    }
    if defined mem.short["percept.vision.color"] {
      mem.short["facets.color.dominant"] = mem.short["percept.vision.color"]
    }
    if defined mem.short["percept.vision.embedding_id"] {
      mem.short["facets.vision.embedding_id"] = mem.short["percept.vision.embedding_id"]
    }

    // Speech processing
    if defined mem.short["percept.speech.transcript"] {
      mem.short["facets.speech.transcript"] = mem.short["percept.speech.transcript"]
    }
    if defined mem.short["percept.speech.intent"] {
      mem.short["facets.speech.intent"] = mem.short["percept.speech.intent"]
    }
    if defined mem.short["percept.speech.sentiment"] {
      mem.short["facets.speech.sentiment"] = mem.short["percept.speech.sentiment"]
    }

    // Affect processing
    if defined mem.short["percept.affect.valence"] {
      mem.short["facets.affect.valence"] = mem.short["percept.affect.valence"]
    }
    if defined mem.short["percept.affect.arousal"] {
      mem.short["facets.affect.arousal"] = mem.short["percept.affect.arousal"]
    }
  }
}
```

## Integration with Rust

### Cargo Dependency

```toml
[dependencies]
sentience = { path = "../../temp-sentience" }
```

### Rust API Usage

```rust
use sentience::SentienceAgent;

// Create agent instance
let mut agent = SentienceAgent::new();

// Register agent with DSL code
let agent_code = r#"
agent MyAgent {
  mem short
  goal: "Process data"
  
  on input(msg) {
    mem.short["processed"] = msg
  }
}
"#;
agent.run_sentience(&agent_code)?;

// Handle input
let result = agent.handle_input("test data");

// Access memory
let value = agent.get_short("processed");
```

## Production Usage in Latent Journey

### Real-Time Processing

The Sentience DSL is actively used in the Latent Journey system for:

1. **Vision Processing**: Converting CLIP outputs to semantic facets
2. **Speech Processing**: Processing Whisper transcripts into structured data
3. **Affect Analysis**: Computing emotional valence and arousal metrics
4. **Memory Management**: Organizing perception data for UI display

### Performance Characteristics

- **Real-Time Execution**: Processes every vision/speech event in <100ms
- **Memory Efficiency**: Lightweight key-value storage system
- **Integration**: Seamless embedding in Rust microservices
- **Scalability**: Handles continuous multimodal data streams

## Language Grammar

### Statements

```sentience
// Agent declaration
agent Name { ... }

// Memory declaration
mem short
mem long

// Input handler
on input(param) { ... }

// Reflection block
reflect { ... }

// Conditional execution
if context includes "string" { ... }

// Memory assignment
mem.short["key"] = "value"

// Embed operation
embed source -> target

// Print operation
print "message"
```

### Data Types

- **Strings**: `"text"`
- **Numbers**: `123`, `45.67`
- **Booleans**: `true`, `false`
- **Memory References**: `mem.short["key"]`, `mem.long["key"]`

## Advanced Features

### 1. Contextual Processing

```sentience
reflect {
  if context includes "urgent" {
    mem.short["priority"] = "high"
  }
  if context includes "question" {
    mem.short["response_type"] = "answer"
  }
}
```

### 2. Memory Consolidation

```sentience
on input(data) {
  // Store in short-term memory
  mem.short["current"] = data
  
  // Check for patterns
  if mem.short["current"] == mem.short["previous"] {
    mem.long["pattern.repetition"] = "detected"
  }
}
```

### 3. Self-Modification

```sentience
reflect {
  // Agent can modify its own behavior based on experience
  if mem.long["success_count"] > 10 {
    mem.short["confidence"] = "high"
  }
}
```

## Design Principles

### 1. Simplicity

- Minimal syntax for maximum expressiveness
- Clear, readable code structure
- Intuitive memory operations

### 2. Emergence

- Designed for emergent behavior
- Self-modification capabilities
- Contextual decision making

### 3. Integration

- Easy embedding in host languages
- Clean API for external systems
- Real-time execution support

## Future Directions

### Planned Features

- **Multi-Agent Communication**: Agent-to-agent messaging
- **Temporal Memory**: Time-based memory organization
- **Learning Mechanisms**: Adaptive behavior modification
- **Visual Programming**: Graphical agent development

### Research Applications

- **Synthetic Consciousness**: Exploring AI self-awareness
- **Emergent Intelligence**: Studying adaptive behavior
- **Human-AI Interaction**: Building interpretable AI systems
- **Cognitive Modeling**: Simulating human-like reasoning

## Conclusion

The Sentience DSL represents a novel approach to AI agent programming, emphasizing memory-first architecture and emergent behavior. Its successful integration in the Latent Journey system demonstrates its practical value for building sophisticated AI systems that can process, reflect, and adapt to their environment.

The language's simplicity, combined with its powerful memory system and contextual processing capabilities, makes it an ideal tool for exploring the boundaries of synthetic intelligence and consciousness.
