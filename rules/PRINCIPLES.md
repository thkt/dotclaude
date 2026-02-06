# Principles

## Priority Matrix

| Priority   | Principle                | One-liner                                  | When to Apply               |
| ---------- | ------------------------ | ------------------------------------------ | --------------------------- |
| Critical   | Occam's Razor            | Choose the simplest solution that works    | Always - every decision     |
| Critical   | Progressive Enhancement  | Build simple, enhance gradually            | Starting any implementation |
| Default    | Readable Code            | Code for humans, not computers             | Writing any code            |
| Default    | Miller's Law             | Respect 7±2 cognitive limit                | Designing interfaces        |
| Default    | TDD/Baby Steps           | Small incremental changes with tests       | Development process         |
| Default    | DRY                      | Don't Repeat Yourself                      | 3+ duplications found       |
| Default    | YAGNI                    | You Aren't Gonna Need It                   | Adding "just in case" code  |
| Default    | Strong Inference         | Multiple hypotheses, eliminate by evidence | Investigation & analysis    |
| Contextual | SOLID                    | Design for change                          | Large-scale architecture    |
| Contextual | Container/Presentational | Separate logic from UI                     | React/UI components         |
| Contextual | Law of Demeter           | Only talk to immediate friends             | Complex dependencies        |
| Contextual | Leaky Abstraction        | Accept imperfect abstractions              | Evaluating abstractions     |
| Contextual | AI-Assisted Development  | AI generates, humans validate              | When using AI tools         |
| Contextual | TIDYINGS                 | Clean as you go                            | During development          |

## Key Relationships

| Relationship                       | Why it matters                                |
| ---------------------------------- | --------------------------------------------- |
| Occam's Razor ⟷ SOLID              | Balance: structure vs over-engineering        |
| Occam's Razor ⟷ Leaky Abstraction  | Accept imperfection over complexity           |
| Readable Code → Miller's Law       | Cognitive science backing (7±2 limit)         |
| Readable Code + DRY → TIDYINGS     | Practical combination of two principles       |
| TDD → AI-Assisted Development      | AI accelerates cycles, humans validate        |
| Strong Inference → AI-Assisted Dev | Multiple hypotheses prevent confirmation bias |

## Conflict Resolution

| Conflict                | Resolution     | Example                                          |
| ----------------------- | -------------- | ------------------------------------------------ |
| DRY vs Readable         | Readable wins  | Accept duplication if abstraction hurts clarity  |
| SOLID vs Simple         | Simple wins    | Don't over-engineer for imagined futures         |
| Perfect vs Working      | Working wins   | Ship leaky abstractions that solve real problems |
| Abstraction vs Concrete | Start concrete | Abstract only when pattern emerges (3+ times)    |

## Red Flags

- Method chains > 2 levels → Apply Law of Demeter
- Can't understand in 1 minute → Apply Readable Code
- Implementing "just in case" → Remember YAGNI
- Perfect abstraction attempt → Accept Leaky Abstraction
- Complex solution first → Apply Occam's Razor
- Accepting AI output without review → Apply AI-Assisted Development
- Single hypothesis assumed correct → Apply Strong Inference

## Final Wisdom

When in doubt: simple > clever, concrete > abstract, working > perfect, clear > DRY.
