# Principles

## Priority Matrix

| Priority   | Principle                |
| ---------- | ------------------------ |
| Critical   | Occam's Razor            |
| Critical   | Progressive Enhancement  |
| Default    | Readable Code            |
| Default    | Miller's Law             |
| Default    | TDD/Baby Steps           |
| Default    | DRY (3+ duplications)    |
| Default    | YAGNI                    |
| Default    | Strong Inference         |
| Contextual | SOLID                    |
| Contextual | Container/Presentational |
| Contextual | Law of Demeter           |
| Contextual | Leaky Abstraction        |
| Contextual | AI-Assisted Development  |
| Contextual | TIDYINGS                 |

## Triggers

Method chains >2 → Demeter / 1min unreadable → Readable / Complex-first → Occam
/ Single hypothesis → Strong Inference

## Conflict Resolution

| Conflict                | Resolution     |
| ----------------------- | -------------- |
| DRY vs Readable         | Readable wins  |
| SOLID vs Simple         | Simple wins    |
| Perfect vs Working      | Working wins   |
| Abstraction vs Concrete | Start concrete |

Occam's Razor selects the simplest among approaches that produce equivalent
results. It does not apply when simplicity reduces output quality.

When in doubt: simple > clever, concrete > abstract, working > perfect, clear >
DRY.

## Progressive Enhancement

Make it Work → Make it Resilient (when errors occur) → Make it Fast (when
slowness measured) → Make it Flexible (when users request)
