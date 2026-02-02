# Code Thresholds

## Quality Gates

| Critical                   | Recommended              |
| -------------------------- | ------------------------ |
| All tests passing (exit 0) | C0 ≥90%, C1 ≥80%         |
| No lint errors             | Documentation updated    |
| No type errors             | Consistent with codebase |
| No regressions             |                          |

## Thresholds

| Target                | Recommended | Warning | Maximum | Rationale     |
| --------------------- | ----------- | ------- | ------- | ------------- |
| Function lines        | ≤30         | 31-50   | 50      | Clean Code    |
| File lines            | ≤400        | 401-800 | 800     | Code Complete |
| Nesting depth         | ≤3          | 4       | 4       | Miller's Law  |
| Function arguments    | ≤3          | 4-5     | 5       | Clean Code    |
| Cyclomatic complexity | ≤10         | 11-15   | 15      | McCabe        |

## Severity

| Violation          | Severity | Action     |
| ------------------ | -------- | ---------- |
| Function >50 lines | High     | Must fix   |
| File >800 lines    | High     | Must fix   |
| Nesting >4 levels  | Medium   | Should fix |
| Arguments >5       | Medium   | Should fix |
| Complexity >15     | Medium   | Should fix |

## Exceptions

| Case                  | Reason                               |
| --------------------- | ------------------------------------ |
| Auto-generated code   | Not manually edited                  |
| Data definition files | Structurally long                    |
| Test files            | Collection of independent test cases |
| Legacy in migration   | Gradual refactoring target           |
