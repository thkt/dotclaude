# SOW Resolution

`$ARGUMENTS`: Calling slash command's full argument string (e.g., `/code "add login"` → `$ARGUMENTS = "add login"`).

## Discovery

1. Check `.claude/workspace/.current-sow` for tracked SOW path
2. If not found → `bfs .claude/workspace/planning -name 'sow.md'`
3. Select latest by directory name date (`YYYY-MM-DD-*`, newest first)
4. If 2+ SOWs share the same latest date → AskUserQuestion to select
5. If found → read SOW + corresponding `spec.md`
6. Extract: Acceptance Criteria, Implementation Plan, Constraints

## SOW State

| State                  | Behavior                                                           |
| ---------------------- | ------------------------------------------------------------------ |
| SOW + spec             | AC + Implementation Plan drive implementation                      |
| SOW only               | AC drives implementation, `$ARGUMENTS` fills implementation detail |
| No SOW                 | `$ARGUMENTS` is sole instruction                                   |
| `$ARGUMENTS` conflicts | SOW wins; flag conflict to user via AskUserQuestion                |

## Status Update

If SOW exists: update `draft` or `completed` → `in-progress`
