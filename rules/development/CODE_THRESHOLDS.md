# Code Thresholds

| Target                | Recommended | Warning | Maximum |
| --------------------- | ----------- | ------- | ------- |
| Function lines        | ≤30         | 31-50   | 50      |
| File lines            | ≤400        | 401-800 | 800     |
| Nesting depth         | ≤3          | 4       | 4       |
| Function arguments    | ≤3          | 4-5     | 5       |
| Cyclomatic complexity | ≤10         | 11-15   | 15      |

## Coverage

| Level | Target | Focus              |
| ----- | ------ | ------------------ |
| C0    | ≥90%   | All lines executed |
| C1    | ≥80%   | All branches taken |

Exceptions: auto-generated code, data definitions, test files, legacy in
migration.
