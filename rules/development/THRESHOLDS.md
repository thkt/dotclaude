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

| Level | Target | Focus                                           |
| ----- | ------ | ----------------------------------------------- |
| C0    | ≥90%   | All lines executed (catches untested code)      |
| C1    | ≥80%   | All branches taken (catches untested decisions) |

Exceptions: auto-generated code, data definitions, test files, legacy in migration.
