# Principles

## Priority Matrix

| Priority   | Principle               | When to Apply               |
| ---------- | ----------------------- | --------------------------- |
| Critical   | Occam's Razor           | Always - every decision     |
| Critical   | Progressive Enhancement | Starting any implementation |
| Default    | Readable Code           | Writing any code            |
| Default    | Miller's Law            | Designing interfaces        |
| Default    | TDD/Baby Steps          | Development process         |
| Default    | DRY                     | 3+ duplications found       |
| Default    | YAGNI                   | Adding "just in case" code  |
| Default    | Strong Inference        | Investigation & analysis    |
| Contextual | SOLID                   | Large-scale architecture    |
| Contextual | Container/Presentational| React/UI components         |
| Contextual | Law of Demeter          | Complex dependencies        |
| Contextual | Leaky Abstraction       | Evaluating abstractions     |
| Contextual | AI-Assisted Development | When using AI tools         |
| Contextual | TIDYINGS                | During development          |

## Triggers

Method chains >2 → Demeter / 1min unreadable → Readable / Complex-first → Occam / Single hypothesis → Strong Inference

## Conflict Resolution

| Conflict                | Resolution     |
| ----------------------- | -------------- |
| DRY vs Readable         | Readable wins  |
| SOLID vs Simple         | Simple wins    |
| Perfect vs Working      | Working wins   |
| Abstraction vs Concrete | Start concrete |

When in doubt: simple > clever, concrete > abstract, working > perfect, clear > DRY.
