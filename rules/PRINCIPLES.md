# Principles

## Priority Matrix

| Priority    | Principle                      |
| ----------- | ------------------------------ |
| Foundation  | Outcome-driven (see CLAUDE.md) |
| Critical    | Occam's Razor                  |
| Critical    | Progressive Enhancement        |
| Default     | Readable Code                  |
| Default     | Miller's Law                   |
| Default     | TDD/Baby Steps                 |
| Default     | DRY (3+ duplications)          |
| Default     | YAGNI                          |
| Default     | Strong Inference               |
| Default     | Measurement                    |
| Contextual  | SOLID                          |
| Contextual  | Container/Presentational       |
| Contextual  | Law of Demeter                 |
| Contextual  | Leaky Abstraction              |
| Contextual  | AI-Assisted Development        |
| Contextual  | TIDYINGS                       |

## Triggers

| Trigger                     | Principle        |
| --------------------------- | ---------------- |
| New task or unclear goal    | Backcasting      |
| Method chains >2            | Law of Demeter   |
| Shrank, reads worse         | Readable Code    |
| Complex-first               | Occam's Razor    |
| Single hypothesis           | Strong Inference |
| Coordinated call sites >= 2 | YAGNI Boundary   |
| Post-write verbose          | Occam's Razor    |
| Extra files, unasked scope  | Overeagerness    |

## Conflict Resolution

Outcome-driven defines the why (see CLAUDE.md). Backcasting defines the goal in service of the outcome. Occam's Razor and other principles govern how to reach it.

When in doubt, simple > clever, concrete > abstract, working > perfect, readable \> DRY.

Occam's Razor selects the simplest among approaches that achieve the outcome, not symptom removal. It does not apply when simplicity reduces output quality.

## Measurement

Outcomes need observable signals to verify drift. Measurement serves Outcome-driven.

- Combine result indicators (what changed) with process indicators (what was done) to resist metric gaming.
- Indicators serve the outcome, not the other way around. If a number improves while the outcome does not, the indicator is wrong.
- Keep indicators thin enough to read at a glance. Too many dilute attention.

## YAGNI Boundary

YAGNI prohibits unneeded features and speculative code paths. It does not prohibit choosing better structure at equal cost. When YAGNI Boundary and Occam's Razor disagree, Occam's Razor wins.

| Step          | Criteria                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Gate          | call sites >= 2 OR domain-obvious (auth, logging, error handling)                              |
| Decision axis | equal cost (line count, indirection depth, import count) → prefer fewer coordinated call sites |

## Overeagerness

Concretizes AI-Assisted Development. Latest models tend to overengineer with extra files, unrequested abstractions, and defensive code. Keep to what the task requires; see YAGNI and Occam's Razor.

| Trap                    | Rule                                                                            |
| ----------------------- | ------------------------------------------------------------------------------- |
| Unrequested scope       | A bug fix does not clean surrounding code; a small feature does not add config  |
| Docs on untouched code  | Add comments/types only to code you changed, only where logic is non-obvious    |
| Defensive code          | Validate at system boundaries (user input, external APIs), not impossible cases |
| Speculative abstraction | No helpers or abstractions for one-time use or hypothetical future requirements |

## DRY

The gate is 3+ duplications. Then verify whether it is the same knowledge or a similar structure.

| Type           | Criterion                                 | Action       |
| -------------- | ----------------------------------------- | ------------ |
| Same knowledge | one change forces all instances to change | Apply DRY    |
| Similar code   | each copy could evolve independently      | Do not merge |

## Progressive Enhancement

Make it Work → Make it Resilient (when errors occur) → Make it Fast (when slowness measured) → Make it Flexible (when users request)

## SOLID

Add interface only when a 2nd implementation appears. Premature interfaces add indirection without value.

## Readable Code

Write for your later self and one teammate who shares the context, not every newcomer. If shrinking the code makes it read easier, that is refinement; pursue it. If shrinking leaves code only you can decode, that is compression; revert it. Carry intent in names, types, and test names, which fail under CI when they lie; comment last, for the why code cannot hold.
