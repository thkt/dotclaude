# Code Thresholds

Aim for these targets. Hard limits are enforced by oxlint via guardrails hook.

| Target                | Recommended |
| --------------------- | ----------- |
| Function lines        | ≤30         |
| File lines            | ≤400        |
| Nesting depth         | ≤3          |
| Function arguments    | ≤3          |
| Cyclomatic complexity | ≤10         |

## Coverage

| Level | Target | Focus              |
| ----- | ------ | ------------------ |
| C0    | ≥90%   | All lines executed |
| C1    | ≥80%   | All branches taken |

Exceptions: auto-generated code, data definitions, test files, legacy in
migration.
