# Sentience (v0.1.1)

Sentience is an experimental, AI-native programming language built around:

- **Memory-first architecture** (`mem.short`, `mem.long`, and potentially `mem.latent`)
- **Agent-based programming** (`goal`, `on input`, `reflect`, `train`, `evolve`)
- **Contextual conditions** (`if context includes`)
- **Embeddable REPL** and optional file interpreter
- Designed for exploring emergent agency, adaptation, and synthetic awareness

> ⚠️ This project is in an early research/prototyping phase.  
> It is not production-ready, may change significantly, and should be considered exploratory research.

---

## Highlights

- **Memory-First Architecture**  
  All agent knowledge (short and long memory) is stored via simple key–value maps inside `AgentContext`.  
- **Agent-Based Programming**  
  Define agents using `agent Name { … }` syntax (including `goal: "…"`, `on input(param) { … }`, `reflect { … }`, `train { … }`, `evolve { … }`).  
- **Contextual Conditions**  
  Inside any `reflect` block (or nested deeper), use `if context includes "some_string" { … }` to execute code only when the short-term memory (`mem.short["msg"]`) contains that substring.  
- **Embeddable REPL**  
  Experiment interactively: register agents, send them input, train or evolve them, and immediately see how they react.  
- **Designed for Emergent Intelligence Research**  
  A minimal language core that allows quick prototyping of synthetic‐agent behavior and introspection.

---

## Quickstart

### 1. Clone and Build

```bash
git clone https://github.com/nbursa/sentience.git
cd sentience
cargo build --release
````

### 2. Run the REPL

```bash
cargo run --release
```

You should see:

```text
Sentience REPL v0.1 (Rust)
>>>
```

### 3. Define and Register an Agent

Within the REPL, type an agent definition block. For example:

```text
>>> agent Reflector {
...   mem short
...   goal: "Detect emotion in input"
...
...   on input(msg) {
...     embed msg -> mem.short
...     reflect {
...       if context includes "joy" {
...         print "You're radiating joy!"
...       }
...       if context includes "sad" {
...         print "I sense sadness..."
...       }
...     }
...   }
... }
```

After closing the `}` you’ll see:

```text
Agent: Reflector
  Init mem: short
  Goal: "Detect emotion in input"
Agent: Reflector [registered]
```

### 4. Send Input to the Agent

Use the `.input` command:

```text
>>> .input I am filled with joy today!
  You're radiating joy!
```

- When you type `.input I am filled with joy today!`, the REPL finds the `on input(msg)` block of the registered agent, sets `mem.short["msg"] = "I am filled with joy today!"`, then executes the body. In our example, the `reflect` block sees “joy” in the message and prints “You’re radiating joy!”.

### 5. Train or Evolve the Agent

Similarly, use:

- **`.train <some_data>`** – triggers the `train { … }` block, setting `mem.short["msg"] = <some_data>` before running its body.
- **`.evolve <some_data>`** – triggers the `evolve { … }` block in the same way.

If the agent does not have a `train` or `evolve` block, REPL will respond with, for example, `Agent has no train block.`

---

## License

This repository is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

Contributors: [Nenad Bursać](https://nenadbursac.com)

---

## Contact

If you have questions, suggestions, or want to contribute, please open an [issue](https://github.com/nbursa/sentience/issues) or submit a pull request.

---

<!-- GitAds-Verify: 483D8373RQT8LRDOVYW2V4FASLJRMSNM -->
## GitAds Sponsored

[![Sponsored by GitAds](https://gitads.dev/v1/ad-serve?source=nbursa/sentience@github)](https://gitads.dev/v1/ad-track?source=nbursa/sentience@github)
