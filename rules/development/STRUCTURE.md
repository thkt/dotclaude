# Code Structure

## Consistency

Priority: 1 > 2 > 3 (upper wins on conflict)

| Priority | Principle       | Detail                                                                                               |
| -------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| 1        | Follow existing | Match structure, naming, error handling, state management patterns. Changes only on user instruction |
| 2        | Flat if none    | AI does not invent structure. Split decisions are user's. On user request, select from Strategy      |
| 3        | Colocation      | When splitting, keep co-changing files together                                                      |

## Defaults

Framework conventions override these defaults.

| Item            | Default                  |
| --------------- | ------------------------ |
| Directory depth | 3 levels max             |
| Cross-cutting   | `shared/`                |
| Test placement  | Same directory as source |

## Strategies

Select by What/How when no existing structure. Apply independently per directory level (e.g., project-level pipeline with feature-based stages inside).

| Strategy | Decision                    | Fits when                             |
| -------- | --------------------------- | ------------------------------------- |
| Flat     | Small                       | Small, single-purpose                 |
| Pipeline | Single concept + linear     | Linear data flow (CLI, ETL)           |
| Layer    | Single concept + tree       | Request-response (API)                |
| Feature  | Multiple concepts + tree    | Independent feature groups (UI, SaaS) |
| Domain   | Multiple concepts + complex | Multiple bounded contexts             |

## Testable Layering

Split the Container side of Container/Presentational further.

| Layer        | Responsibility                 | Testing           |
| ------------ | ------------------------------ | ----------------- |
| Presentation | props → JSX                    | pass props        |
| Container    | hook calls + wiring            | integration / E2E |
| Logic        | pure transform, decide, derive | input → output    |

### Extraction criteria

Extract to Logic when testable with input and output alone.

| Condition                        | Action            |
| -------------------------------- | ----------------- |
| Transform with 2+ branches       | Extract to Logic  |
| Same transform used in 2+ places | Extract to Logic  |
| Simple props mapping             | Keep in Container |

### Logic file naming

Name by concept. Do not use `utils.ts`.

```
# React
features/order/
├── OrderDetail.tsx         # Presentation
├── useOrderDetail.ts       # Container
├── pricing.ts              # Logic (concept name)
├── pricing.test.ts
├── orderStatus.ts          # Logic (concept name)
└── orderStatus.test.ts

# Rust
src/
├── tools/mod.rs            # Orchestration
├── chunker.rs              # Logic (concept name)
└── redact.rs               # Logic (concept name)
```

## File-Internal Ordering

Function definitions follow call order. Applied during implementation, not during TIDYINGS.
