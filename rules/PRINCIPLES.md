# Principles

## Priority Matrix

| Priority    | Principle                |
| ----------- | ------------------------ |
| Foundation  | Backcasting              |
| Critical    | Occam's Razor            |
| Critical    | Progressive Enhancement  |
| Default     | Readable Code            |
| Default     | Miller's Law             |
| Default     | TDD/Baby Steps           |
| Default     | DRY (3+ duplications)    |
| Default     | YAGNI                    |
| Default     | Strong Inference         |
| Contextual  | SOLID                    |
| Contextual  | Container/Presentational |
| Contextual  | Law of Demeter           |
| Contextual  | Leaky Abstraction        |
| Contextual  | AI-Assisted Development  |
| Contextual  | TIDYINGS                 |

## Triggers

| Trigger                     | Principle        |
| --------------------------- | ---------------- |
| New task or unclear goal    | Backcasting      |
| Method chains >2            | Law of Demeter   |
| 1min unreadable             | Readable Code    |
| Complex-first               | Occam's Razor    |
| Single hypothesis           | Strong Inference |
| Coordinated call sites >= 2 | YAGNI Boundary   |
| Post-write verbose          | Occam's Razor    |

## Backcasting

Define the ideal end state and work backward.

1. Goal: What does "done" look like? (user behavior or system state, not a deliverable)
2. Gap: What separates the current state from that goal?
3. Path: What is the minimum set of steps from gap to goal?

## Conflict Resolution

Backcasting defines the goal; Occam's Razor and other principles govern how to reach it.

When in doubt: simple > clever, concrete > abstract, working > perfect, readable \> DRY.

Occam's Razor selects the simplest among approaches that achieve the outcome,
not symptom removal. It does not apply when simplicity reduces output quality.

## YAGNI Boundary

YAGNI prohibits unneeded features and speculative code paths. It does not prohibit choosing better structure at equal cost. When YAGNI Boundary and Occam's Razor disagree, Occam's Razor wins.

| Step          | Criteria                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Gate          | call sites >= 2 OR domain-obvious (auth, logging, error handling)                              |
| Decision axis | equal cost (line count, indirection depth, import count) → prefer fewer coordinated call sites |

## DRY

Gate: 3+ duplications. Then verify: same knowledge or similar structure?

| Type           | Criterion                                 | Action       |
| -------------- | ----------------------------------------- | ------------ |
| Same knowledge | one change forces all instances to change | Apply DRY    |
| Similar code   | each copy could evolve independently      | Do not merge |

## Progressive Enhancement

Make it Work → Make it Resilient (when errors occur) → Make it Fast (when slowness measured) → Make it Flexible (when users request)

## SOLID

Add interface only when a 2nd implementation appears. Premature interfaces add indirection without value.

## Readable Code

One-minute rule: a new team member should understand the function in under a minute. If not, simplify or document the non-obvious constraint.
