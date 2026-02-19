# Quality Loop

Read `implementation` from handoff.yaml. Automatic review→fix→re-review cycle.

| Step | Action                                            | Exit Condition                                                                          |
| ---- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1    | /audit (capture critical + high findings)         | 0 critical/high → Step 2                                                                |
| 2    | AC check (see below)                              | All ACs met → Step 3                                                                    |
| 3    | /test (verify passes)                             | Pass → Step 8. Fail with unfixed critical/high → Step 4. Fail (none remaining) → Step 6 |
| 4    | Auto-fix audit findings + unmet ACs               | → Step 5                                                                                |
| 5    | /test (verify no regression)                      | Pass → Step 6. Fail → revert, Step 6                                                    |
| 6    | Increment iteration (max 3) → Step 1              | Max reached → Step 7                                                                    |
| 7    | Present remaining issues to user (Prompt: Triage) | User decides                                                                            |
| 8    | /polish → /test (final)                           | Tests fail → fix, re-test (max 2). Still failing → Step 7                               |

## AC Check (Step 2)

Read SOW acceptance criteria (`architecture.sow_path`). For each AC:

| Check        | Method                                    |
| ------------ | ----------------------------------------- |
| Implemented? | Grep target files for AC-related logic    |
| Tested?      | Grep test files for AC-related assertions |

Unmet ACs are treated as findings in Step 4 auto-fix.

## Auto-fix Rules

| Severity | Action                 |
| -------- | ---------------------- |
| Critical | Always fix             |
| High     | Fix if confidence ≥80% |
| Medium   | Skip                   |
| Low      | Skip                   |

## Regression Guard

Before auto-fix: `git diff --name-only` → save as `autofix_baseline` in handoff.yaml. Save fails → skip, present findings.
After auto-fix: `git diff --name-only` → diff from baseline.
Test fails: `git checkout HEAD -- <changed-files>` to revert. Mark "auto-fix failed", present to user.
Checkout fails: notify user with file list (never `git checkout -- .`).
