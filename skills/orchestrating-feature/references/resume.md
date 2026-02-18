# Feature Resume

## Discovery

[@../../lib/sow-resolution.md]

## Resume Point

Read handoff.yaml (same directory as sow.md) to determine resume point.

| Handoff State                            | Resume Action                   |
| ---------------------------------------- | ------------------------------- |
| `quality` exists, `tests_passing: true`  | Phase 7 (Validation)            |
| `quality` exists, `tests_passing: false` | Phase 6 (re-enter Quality Loop) |
| `implementation` section exists          | Phase 6 (Quality Loop)          |
| `architecture` section exists            | Phase 5 (Implementation)        |
| `discovery` section exists               | Phase 2-4 (Exploration)         |
| handoff.yaml exists but malformed        | Warn user, treat as Phase 1     |
| No handoff.yaml                          | Phase 1 (Discovery)             |

## Fallback

If handoff.yaml missing but SOW exists → read SOW status field:

| SOW Status    | Resume Action                     |
| ------------- | --------------------------------- |
| `in-progress` | Phase 2-4 (ask user to confirm)   |
| `completed`   | Phase 7 (Validation)              |
| `draft`       | Phase 1 (Discovery)               |
