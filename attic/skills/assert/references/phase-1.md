# Phase 1: Evidence Collection (Parallel)

Launch all three in parallel via Task (background). Proceed to Phase 2 after all complete. When codex runs as a background Bash, read the harness-assigned output-file directly (do not re-redirect to `$TMPDIR`).

| Task            | Executor           | Action                                                            |
| --------------- | ------------------ | ----------------------------------------------------------------- |
| Codex review    | Codex CLI (Bash)   | Static review of changed / target code                            |
| Audit reviewers | Claude Code agents | Domain-specific static analysis                                   |
| Test execution  | Codex CLI (Bash)   | Test command in worktree (build reused from bootstrap smoke test) |

## 1a. Codex Static Review

| Mode               | Command                                                           |
| ------------------ | ----------------------------------------------------------------- |
| diff (uncommitted) | `codex review --uncommitted`                                      |
| diff (branch)      | `codex review --base $BASE`                                       |
| target             | `codex review --uncommitted` (after copying target files context) |

The table below defines the normalization targets for Codex severity. `${CLAUDE_SKILL_DIR}/scripts/merge-findings.py` applies the normalization (§ Finding Deduplication). Skip findings without `file:line` or outside scope.

| Codex severity | Normalized |
| -------------- | ---------- |
| `[P1]`         | high       |
| `[P2]`         | medium     |
| `[P3]`         | drop       |

## 1b. Audit Reviewers

Use the `/audit` file routing table as is, applying the same reviewer assignments per file type. Changes on the routing-table side propagate directly to `/assert` reviewer assignment.

Each reviewer is spawned as an independent background Task.

| Constraint   | Value                               |
| ------------ | ----------------------------------- |
| Input        | Assigned file list + finding-schema |
| Max parallel | 10 (batch if more)                  |
| Timeout      | 120s per reviewer                   |

## 1c. Test Execution

Requires Phase 0 success; skip if it failed. The build is not re-run here; reuse the bootstrap smoke test result for the Build column in the Evidence table. Run the command below in the worktree.

```bash
codex exec -c sandbox_workspace_write.network_access=true -C <worktree-path> "Run the project test command. Report: (1) test exit code and last 50 lines of stderr if non-zero, (2) test summary (total/passed/failed)." </dev/null
```

| Constraint | Value                                                          |
| ---------- | -------------------------------------------------------------- |
| Timeout    | 600s                                                           |
| Captures   | test pass/fail (with stderr). Build value comes from bootstrap |

## Finding Deduplication

Severity normalization and dedup by `file:line` are delegated to `${CLAUDE_SKILL_DIR}/scripts/merge-findings.py`. Category is not part of the dedup key, and findings detected by multiple sources have their source tags unioned and recorded as `[codex, reviewer-security]`.

The orchestrator collects the 1a Codex findings and the 1b reviewer findings into one JSON array, saves it to a file, and passes it to the script. Each array element has at least `{file, line, severity, source}`. severity may be `[P1]/[P2]/[P3]` or `high/medium/low`. The script applies the normalization. `[P3]` and any unrecognized severity are dropped (not included in issues).

```bash
"${CLAUDE_SKILL_DIR}/scripts/merge-findings.py" <findings-json-file>
```

Findings with no `file:line` and out-of-scope findings are excluded by the orchestrator before the script runs. Pass the script output to the Phase 2 challenger and verifier.
