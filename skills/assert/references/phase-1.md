# Phase 1: Evidence Collection (Parallel)

Launch all three in parallel via Task (background). Proceed to Phase 2 after all complete.

| Task            | Executor           | Action                                                            |
| --------------- | ------------------ | ----------------------------------------------------------------- |
| Codex review    | Codex CLI (Bash)   | Static review of changed/target code                              |
| Audit reviewers | Claude Code agents | Domain-specific static analysis                                   |
| Test execution  | Codex CLI (Bash)   | Test command in worktree (build reused from bootstrap smoke test) |

## 1a. Codex Static Review

| Mode               | Command                                                           |
| ------------------ | ----------------------------------------------------------------- |
| diff (uncommitted) | `codex review --uncommitted`                                      |
| diff (branch)      | `codex review --base $BASE`                                       |
| target             | `codex review --uncommitted` (after copying target files context) |

Severity is normalized per the table below. Skip findings without file:line or outside scope.

| Codex severity | Normalized |
| -------------- | ---------- |
| `[P1]`         | high       |
| `[P2]`         | medium     |
| `[P3]`         | drop       |

## 1b. Audit Reviewers

Use the /audit file routing table as is, applying the same reviewer assignments per file type. Changes on the routing-table side propagate directly to /assert reviewer assignment.

Each reviewer is spawned as an independent background Task.

| Constraint   | Value                               |
| ------------ | ----------------------------------- |
| Input        | Assigned file list + finding-schema |
| Max parallel | 10 (batch if more)                  |
| Timeout      | 120s per reviewer                   |

## 1c. Test Execution (Codex exec in worktree)

Requires Phase 0 success; skip if it failed. The build is not re-run here; the orchestrator reuses the bootstrap smoke test result (Step 4) for the Build column in the Evidence table.

```bash
codex exec -C <worktree-path> "Run the project test command. Report: (1) test exit code and last 50 lines of stderr if non-zero, (2) test summary (total/passed/failed)."
```

| Constraint | Value                                                          |
| ---------- | -------------------------------------------------------------- |
| Timeout    | 600s                                                           |
| Captures   | test pass/fail (with stderr). Build value comes from bootstrap |

## Phase 1→2 Transition: Finding Deduplication

Deduplicate by `file:line` across Codex and reviewer findings. Category schemas differ between sources, so category is not part of the dedup key. Source tags are retained for traceability; findings detected by multiple sources are recorded as `[codex, reviewer-security]`.

| Step | Action                                                                |
| ---- | --------------------------------------------------------------------- |
| 1    | Deduplicate Codex and reviewer findings by `file:line`                |
| 2    | On collision: keep highest severity, retain all source tags as a list |
| 3    | Pass deduplicated set to Phase 2 challenger and verifier              |
