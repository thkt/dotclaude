# Feature-Driven TDD

How `/code` command uses TDD for new feature development.

## Context

| Aspect   | Value                                |
| -------- | ------------------------------------ |
| Source   | spec.md with functional requirements |
| Approach | Generate all tests in skip state     |
| Order    | Simple → Complex (Baby Steps)        |
| Control  | User activates one test at a time    |

## Workflow

| Step | Action                                                      |
| ---- | ----------------------------------------------------------- |
| 1    | Read spec.md → Extract FR-xxx → Identify Given-When-Then    |
| 2    | Generate skipped tests (`it.skip()`) ordered simple→complex |
| 3    | Interactive activation: [Y]es/[S]kip/[Q]uit → RGRC cycle    |
| 4    | Repeat until all tests active and passing                   |

## Key Characteristics

| Characteristic  | Description                 |
| --------------- | --------------------------- |
| Proactive       | Tests before implementation |
| Spec-driven     | Requirements → tests → code |
| User-controlled | Explicit activation         |
| Baby Steps      | One test at a time          |

## RGRC Cycle Per Test

| Phase    | Action                           |
| -------- | -------------------------------- |
| Red      | Remove .skip, verify test fails  |
| Green    | Minimal implementation to pass   |
| Refactor | Clean up while tests stay green  |
| Commit   | Save progress with passing tests |

## Decision Points

| Question           | Answer                              |
| ------------------ | ----------------------------------- |
| When to skip test? | Too complex, dependencies not ready |
| When to commit?    | All tests green, code refactored    |
| Commit frequency   | Every test activation (~5-10 min)   |

## Common Pitfalls

| Pitfall                    | Fix                           |
| -------------------------- | ----------------------------- |
| Activating multiple tests  | One test at a time only       |
| Implementation before test | Activate test first (Red)     |
| Skipping Refactor phase    | Always clean up before commit |
