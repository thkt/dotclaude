# Feature Resume

## Discovery

1. Check `.claude/workspace/.current-sow` for tracked SOW path
2. If not found → Glob for `.claude/workspace/planning/*/sow.md`
3. If multiple SOWs → prompt user to select via AskUserQuestion

## Resume Point

Read handoff.yaml (same directory as sow.md) to determine resume point.

| Handoff State                  | Resume Action                   |
| ------------------------------ | ------------------------------- |
| `quality` section exists       | Phase 7 (Validation)            |
| `implementation` section exists | Phase 6 (Quality Loop)          |
| `architecture` section exists  | Phase 5 (Implementation)        |
| `discovery` section exists     | Phase 2-4 (Exploration)         |
| No handoff.yaml                | Phase 1 (Discovery)             |

## Fallback

If handoff.yaml missing but SOW exists → read SOW status field as fallback:

```yaml
status: in-progress  # draft | in-progress | completed
```
