# Feature Resume

## SOW Discovery

1. Check `$HOME/.claude/workspace/.current-sow` for tracked SOW path
2. If not found → Glob for `$HOME/.claude/workspace/planning/*/sow.md`
3. If multiple SOWs → prompt user to select via AskUserQuestion
4. Read SOW metadata to determine resume point

## Resume Actions

| SOW Status          | Action                            |
| ------------------- | --------------------------------- |
| Phase N in-progress | Continue from last completed step |
| Phase N completed   | Start from Phase N+1              |
| No SOW found        | Start fresh from Phase 1          |

## State Tracking

SOW metadata fields for resume:

```yaml
status:
  current_phase: 4
  current_step: 2
  completed_phases: [1, 2, 3]
  exploration_summary: "..."
  clarification_answers: { ... }
  selected_architecture: "pragmatic"
  implementation_mode: "parallel"
```
