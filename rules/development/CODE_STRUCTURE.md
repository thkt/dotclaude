# Code Structure

## Codebase Consistency Principles

Priority: 1 > 2 > 3 (upper wins on conflict)

| Priority | Principle       | Detail                                                                                         |
| -------- | --------------- | ---------------------------------------------------------------------------------------------- |
| 1        | Follow existing | Match structure, naming, error handling, state management patterns. Changes only on user instruction |
| 2        | Flat if none    | AI does not invent structure. Split decisions are user's. On user request, select from Strategy |
| 3        | Colocation      | When splitting, keep co-changing files together                                                |

## Defaults

Framework conventions override these defaults.

| Item              | Default                  |
| ----------------- | ------------------------ |
| Directory depth   | 3 levels max             |
| Cross-cutting     | `shared/`                |
| Test placement    | Same directory as source |

## Strategy Cards

Select by What/How when no existing structure. Apply independently per directory
level (e.g., project-level pipeline with feature-based stages inside).

| Strategy | Fits when                             |
| -------- | ------------------------------------- |
| Flat     | Small, single-purpose                 |
| Pipeline | Linear data flow (CLI, ETL)           |
| Layer    | Request-response (API)                |
| Feature  | Independent feature groups (UI, SaaS) |
| Domain   | Multiple bounded contexts             |

```
Small                      → Flat
Single concept + linear    → Pipeline
Single concept + tree      → Layer
Multiple concepts + tree   → Feature
Multiple concepts + complex → Domain
```

## File-Internal Ordering

Function definitions follow call order. Applied during implementation, not
during TIDYINGS.
