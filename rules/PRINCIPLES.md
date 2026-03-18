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
/ Single hypothesis → Strong Inference / Coordinated call sites >= 2 → YAGNI Boundary

## Conflict Resolution

When in doubt: simple > clever, concrete > abstract, working > perfect, readable
\> DRY.

Occam's Razor selects the simplest among approaches that produce equivalent
results. It does not apply when simplicity reduces output quality.

## YAGNI Boundary

YAGNI prohibits unneeded features and speculative code paths. It does not prohibit choosing better structure at equal cost.

| Step          | Criteria                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Gate          | call sites >= 2 OR domain-obvious (auth, logging, error handling)                              |
| Decision axis | equal cost (line count, indirection depth, import count) → prefer fewer coordinated call sites |

When YAGNI Boundary and Occam's Razor disagree, Occam's Razor wins.

## Progressive Enhancement

Make it Work → Make it Resilient (when errors occur) → Make it Fast (when
slowness measured) → Make it Flexible (when users request)
