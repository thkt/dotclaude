# SOW Resolution

## Discovery

1. Check `.claude/workspace/.current-sow` for tracked SOW path
2. If not found → `Glob(".claude/workspace/planning/*/sow.md")`
3. Select latest by directory name date (`YYYY-MM-DD-*`, newest first)
4. If ambiguous → AskUserQuestion to select
5. If found → read SOW + corresponding `spec.md`
6. Extract: Acceptance Criteria, Implementation Plan, Constraints

## SOW State

| State          | Behavior                                                   |
| -------------- | ---------------------------------------------------------- |
| SOW + spec     | AC + Implementation Plan drive implementation              |
| SOW only       | AC drives implementation, `$1` fills implementation detail |
| No SOW         | `$1` is sole instruction                                   |
| `$1` conflicts | SOW wins; flag conflict to user via AskUserQuestion        |

## Status Update

If SOW exists: update `draft` or `completed` → `in-progress`
