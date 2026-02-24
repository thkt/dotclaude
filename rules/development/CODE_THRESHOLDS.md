# Code Thresholds

Enforcement: oxlint (`max-lines-per-function`, `max-lines`, `max-depth`,
`max-params`, `complexity`) via guardrails hook.

| Target                | Recommended | Maximum (oxlint error) |
| --------------------- | ----------- | ---------------------- |
| Function lines        | ≤30         | 50                     |
| File lines            | ≤400        | 800                    |
| Nesting depth         | ≤3          | 4                      |
| Function arguments    | ≤3          | 5                      |
| Cyclomatic complexity | ≤10         | 15                     |

## Coverage

| Level | Target | Focus              |
| ----- | ------ | ------------------ |
| C0    | ≥90%   | All lines executed |
| C1    | ≥80%   | All branches taken |

Exceptions: auto-generated code, data definitions, test files, legacy in
migration.
