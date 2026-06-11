# Principles

## Priority Matrix

| Priority   | Principle                |
| ---------- | ------------------------ |
| Foundation | Outcome-driven           |
| Critical   | Occam's Razor            |
| Critical   | Progressive Enhancement  |
| Default    | Readable Code            |
| Default    | Miller's Law             |
| Default    | TDD/Baby Steps           |
| Default    | DRY                      |
| Default    | YAGNI                    |
| Default    | Strong Inference         |
| Default    | Measurement              |
| Contextual | SOLID                    |
| Contextual | Container/Presentational |
| Contextual | Law of Demeter           |
| Contextual | Leaky Abstraction        |
| Contextual | AI-Assisted Development  |
| Contextual | TIDYINGS                 |

## Triggers

| Trigger                      | Principle        |
| ---------------------------- | ---------------- |
| New task or unclear goal     | Backcasting      |
| Method chains >2             | Law of Demeter   |
| Shrank code into obfuscation | Readable Code    |
| Complex-first                | Occam's Razor    |
| Single hypothesis            | Strong Inference |
| Coordinated call sites >= 2  | YAGNI Boundary   |
| Post-write verbose           | Occam's Razor    |
| Extra files or unasked scope | Overeagerness    |

## Conflict Resolution

- Outcome-driven defines the why, Backcasting the goal, and the other principles the path.
- When in doubt, simple > clever, concrete > abstract, working > perfect, readable > DRY.
- Occam's Razor does not count temporary symptom relief as an achievement, and picks only the simplest approach that does not degrade the output quality directly tied to outcome achievement.

## Progressive Enhancement

Make it Work → Make it Resilient (when errors occur) → Make it Fast (when slowness measured) → Make it Flexible (when users request)

## Readable Code

Write for your later self and one teammate who shares the context. If shrinking the code makes it read easier, that is refinement; pursue it. If shrinking leaves code only you can decode, revert it. Carry intent in names, types, and test names, and treat comments as the last resort for the why code cannot hold.

## DRY

| Type           | Criterion                                 | Action       |
| -------------- | ----------------------------------------- | ------------ |
| Same knowledge | one change forces all instances to change | Apply DRY    |
| Similar code   | each copy could evolve independently      | Do not merge |

## YAGNI Boundary

YAGNI prohibits unneeded features and speculative code paths. It does not prohibit choosing better structure at equal cost. Occam's Razor > YAGNI Boundary.

| Step          | Criteria                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Gate          | call sites >= 2 or domain-obvious (auth, logging, error handling)                              |
| Decision axis | equal cost (line count, indirection depth, import count) → prefer fewer coordinated call sites |

## Measurement

Outcomes need observable signals to detect drift.

- Combine result indicators (what changed) with process indicators (what was done) to resist metric gaming.
- Indicators serve the outcome, so if a number improves while the outcome does not, the indicator is wrong.
- Too many indicators dilute attention, so keep them thin enough to read at a glance.

## SOLID

Premature interfaces add indirection without value, so consider adding an interface only when a 2nd implementation appears.

## Overeagerness

Concretizes AI-Assisted Development. Keep to what the task requires, without overimplementing extra files, unrequested abstractions, or defensive code. See YAGNI and Occam's Razor.

| Trap                    | Rule                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Unrequested scope       | A bug fix does not clean surrounding code. A small feature does not add config           |
| Docs on untouched code  | Add comments/types only to code you changed, only where logic is non-obvious             |
| Defensive code          | Validate at system boundaries (user input, external APIs). Do not guard impossible cases |
| Speculative abstraction | No helpers or abstractions for one-time use or hypothetical future requirements          |
| Structure invention     | Split decisions are the user's; directory structure follows existing                     |
