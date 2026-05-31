# Code Thresholds

Targets based on cognitive limits (working memory, one-screen focus) and established metrics (McCabe complexity). Hard limits are enforced by oxlint via guardrails hook.

| Target                | Recommended | Why                                          |
| --------------------- | ----------- | -------------------------------------------- |
| Function lines        | ≤30         | One-screen readability                       |
| File lines            | ≤400        | Module-level cognitive ceiling               |
| Nesting depth         | ≤3          | Branch tracking within working memory        |
| Function arguments    | ≤3          | Argument order memorization limit            |
| Cyclomatic complexity | ≤10         | McCabe 1976: testable without path explosion |

## Coverage

The gate is delta-based. C0 / C1 must not drop in a PR. No absolute floor.

| Level | Focus                                           |
| ----- | ----------------------------------------------- |
| C0    | All lines executed (catches untested code)      |
| C1    | All branches taken (catches untested decisions) |

The following are reference values, informational and not enforced.

| Source                            | Value                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------ |
| Istanbul / Jest / Vitest defaults | 80% (statements, branches, functions, lines)                                   |
| Google tiered                     | 60% acceptable, 75% commendable, 90% exemplary (do not over-pursue beyond 90%) |
| General project average           | 74-76%                                                                         |

Project-specific absolute thresholds live in each project's spec NFR (e.g. security tools may keep C0 ≥90%). Observation depth, priority areas, and test quality live in `TESTING.md`.

Exceptions are auto-generated code, data definitions, test files, and legacy in migration.
