# Feature Resume

## Discovery

[@../../lib/sow-resolution.md]

## Resume Point

Read handoff.yaml (same directory as sow.md):

| Handoff State                            | Resume Action                                           |
| ---------------------------------------- | ------------------------------------------------------- |
| `quality` exists, `tests_passing: true`  | Phase 7 (Validation)                                    |
| `quality` exists, `tests_passing: false` | Phase 6 (re-enter Quality Loop)                         |
| `implementation` section exists          | Phase 6 (Quality Loop)                                  |
| `architecture` section exists            | Phase 5 (Implementation)                                |
| `discovery` section exists               | Phase 2-4 (Exploration)                                 |
| handoff.yaml exists but malformed        | Copy to `handoff.yaml.bak`, warn user, treat as Phase 1 |
| No handoff.yaml                          | Phase 1 (Discovery)                                     |

Sections written on phase completion only (Write-on-complete rule).

## Re-entry Policy

If user requests re-running an earlier phase:

1. Copy current handoff.yaml to `handoff.yaml.bak`
2. Remove sections after the re-entry point
3. Resume from the requested phase

## Fallback

handoff.yaml missing but SOW exists → read SOW status:

| SOW Status    | Resume Action                   |
| ------------- | ------------------------------- |
| `in-progress` | Phase 2-4 (ask user to confirm) |
| `completed`   | Phase 7 (Validation)            |
| `draft`       | Phase 1 (Discovery)             |
