# Review Checklist

## Per-File Review

| Check        | What to Look For                                    |
| ------------ | --------------------------------------------------- |
| PR alignment | Changes serve the stated purpose                    |
| Code style   | Consistent with surrounding codebase                |
| Security     | Injection, XSS, auth bypass, secret exposure        |
| Side effects | Unintended behavior changes to existing features    |
| Performance  | Unnecessary API/DB calls, memory leaks, N+1 queries |
| Code smells  | Duplication, deep nesting, god functions            |

## Dependency Impact

| Check               | Method                                       |
| ------------------- | -------------------------------------------- |
| Import dependents   | Grep for imports of changed files/exports    |
| Interface contracts | Verify unchanged function signatures         |
| Shared state        | Check global/module state mutations          |
| Test coverage       | Existing tests still valid for changed paths |

## Comment Sections

| Section         | Content                              |
| --------------- | ------------------------------------ |
| Requires action | `[must]`, `[want]` findings          |
| Awareness only  | `[imo]`, `[ask]`, `[nits]`, `[info]` |

## Test Assessment

Before suggesting "add tests":

1. Check if the project has test infrastructure
2. Check if similar code has tests
3. Only suggest tests when the project convention expects them
