# Principles

## Priority Matrix

| Priority   | Principle                  |
| ---------- | -------------------------- |
| Foundation | Outcome-driven             |
| Critical   | Occam's Razor              |
| Critical   | Progressive Enhancement    |
| Default    | Readable Code              |
| Default    | Miller's Law               |
| Default    | TDD / Baby Steps           |
| Default    | DRY                        |
| Default    | YAGNI                      |
| Default    | Reuse Ordering             |
| Default    | Strong Inference           |
| Default    | Measurement                |
| Contextual | SOLID                      |
| Contextual | Container / Presentational |
| Contextual | Law of Demeter             |
| Contextual | Leaky Abstraction          |
| Contextual | AI-Assisted Development    |
| Contextual | TIDYINGS                   |

## Triggers

| Trigger                      | Principle        |
| ---------------------------- | ---------------- |
| New task or unclear goal     | Backcasting      |
| Method chains >2             | Law of Demeter   |
| Shrank code into obfuscation | Readable Code    |
| Complex-first                | Occam's Razor    |
| Single hypothesis            | Strong Inference |
| Coordinated call sites >= 2  | YAGNI Boundary   |
| Before new code or a new dep | Reuse Ordering   |
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

- When one change forces all instances to change, it is the same knowledge, so apply DRY
- When each copy could evolve independently, it is merely similar code, so do not merge

## YAGNI Boundary

YAGNI prohibits unneeded features and speculative code paths. It does not prohibit choosing better structure at equal cost. Occam's Razor > YAGNI Boundary.

- Open the abstraction gate when call sites are >= 2, or the domain is obvious like auth, logging, or error handling
- When cost measured by line count, indirection depth, and import count is equal, prefer fewer coordinated call sites

## Reuse Ordering

After understanding the problem and before writing code, work through these top to bottom. If a higher rung holds, do not drop to a lower one. When two options are the same size, pick the one that is correct on edge cases. Reducing how much you write never drops validation, error handling, security, or accessibility.

1. Don't build what isn't needed. Skip a speculative need
2. Reuse an existing helper / util / pattern in this codebase
3. Reach for the standard library before hand-rolling
4. Use a native platform feature. `<input type="date">` over a picker, CSS over JS, DB constraint over app code
5. Use an installed dependency. No new dep for what a few lines do
6. Write new code only when nothing above fits. Keep it the minimum that works

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
