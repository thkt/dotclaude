# Phase Details

Detailed execution of each verify phase. SKILL.md references this per phase.

## Phase 1: Evidence Collection (Parallel)

Launch all three in parallel via Task (background). Proceed to Phase 2 after
all complete.

| Task            | Executor           | Action                               |
| --------------- | ------------------ | ------------------------------------ |
| Codex review    | Codex CLI (Bash)   | Static review of changed/target code |
| Audit reviewers | Claude Code agents | Domain-specific static analysis      |
| Outcome check   | Codex CLI (Bash)   | Build + test execution in worktree   |

### 1a. Codex Static Review

| Mode               | Command                                                           |
| ------------------ | ----------------------------------------------------------------- |
| diff (uncommitted) | `codex review --uncommitted`                                      |
| diff (branch)      | `codex review --base $BASE`                                       |
| target             | `codex review --uncommitted` (after copying target files context) |

| Codex severity | Normalized |
| -------------- | ---------- |
| `[P1]`         | high       |
| `[P2]`         | medium     |
| `[P3]`         | drop       |

Skip findings without file:line or outside scope.

### 1b. Audit Reviewers

Use /audit file routing table (`skills/audit/SKILL.md` § File Routing). Apply
same reviewer assignments per file type.

Each reviewer spawned as standalone background Task.

| Constraint   | Value                               |
| ------------ | ----------------------------------- |
| Input        | Assigned file list + finding-schema |
| Max parallel | 10 (batch if more)                  |
| Timeout      | 120s per reviewer                   |

### 1c. Outcome Verification (Codex exec in worktree)

Requires Phase 0 success. Skip if failed.

```bash
codex exec -C <worktree-path> "Run the project build and test commands. \
Report: (1) build exit code and last 50 lines of stderr if non-zero, \
(2) test exit code and last 50 lines of stderr if non-zero, \
(3) test summary (total/passed/failed)."
```

| Constraint | Value                                             |
| ---------- | ------------------------------------------------- |
| Timeout    | 600s                                              |
| Captures   | build pass/fail + test pass/fail (each w/ stderr) |

## Phase 1→2 Transition: Finding Deduplication

1. Deduplicate by `file:line:category` across Codex and reviewer findings
2. Keep highest severity on collision
3. Pass deduplicated set to Phase 2 challenger and verifier

## Phase 2: Deep Verification (Parallel)

Launch all three in parallel:

| Task             | Executor              | Input                         |
| ---------------- | --------------------- | ----------------------------- |
| Adversarial test | Codex CLI (Bash)      | Scoped code in worktree       |
| Challenger       | devils-advocate-audit | Deduplicated Phase 1 findings |
| Verifier         | evidence-verifier     | Deduplicated Phase 1 findings |

### 2a. Adversarial Testing (Codex exec in worktree)

Requires Phase 0 success. Skip if failed.

```bash
codex exec -C <worktree-path> --full-auto "<adversarial-prompt>"
```

`<adversarial-prompt>`: [`adversarial.md`](adversarial.md) § Codex Prompt
(fill in scoped file list).

| Constraint | Value |
| ---------- | ----- |
| Timeout    | 600s  |

### 2b. Challenger + Verifier

| Task       | subagent_type         | Input                         |
| ---------- | --------------------- | ----------------------------- |
| Challenger | devils-advocate-audit | Deduplicated Phase 1 findings |
| Verifier   | evidence-verifier     | Deduplicated Phase 1 findings |

120s timeout each. Background Tasks.

## Phase 2.5: Intent Verification

After Phase 2a returns, orchestrator triages failing tests.

[`adversarial.md`](adversarial.md) § Intent Verification verdict rules:
assertion + target code → search intent sources → verdict (exclude or promote
0.70+).

## Phase 3: Evidence Synthesis

Spawn `evidence-integrator` as background Task.

| Input               | Source                                                            |
| ------------------- | ----------------------------------------------------------------- |
| Challenger output   | Raw challenger output (evidence-integrator reconciles internally) |
| Verifier output     | Raw verifier output (evidence-integrator reconciles internally)   |
| Outcome evidence    | Phase 1c build/test results                                       |
| Adversarial results | Phase 2.5 promoted findings                                       |

Returns: root causes + Gate decision + report.
[`gate-decision.md`](gate-decision.md) § Gate Rule.

## Cleanup (Always)

Wrap all phases in try/finally to guarantee cleanup regardless of outcome.

```bash
git worktree remove <worktree-path> --force
git branch -D verify-<session-id>
```
