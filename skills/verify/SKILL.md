---
name: verify
description: |
  Independent outcome-based verification with Codex + audit reviewers.
  Use when user mentions 検証して, verify, 独立検証, outcome verification,
  trust score, adversarial testing.
  Do NOT use for quick code review (use /polish) or static-only audit
  (use /audit).
allowed-tools: Bash(codex:*), Bash(git worktree:*), Bash(git diff:*),
  Bash(git status:*), Bash(git log:*), Bash(git branch:*),
  Bash(npm ci:*), Bash(npm run:*), Bash(npm test:*),
  Bash(cargo:*), Bash(make:*), Bash(bun:*), Bash(pnpm:*),
  Bash(yarn:*), Bash(which:*), Bash(date:*), Bash(rm:*),
  Read, Write, Grep, Glob, LS, Task, AskUserQuestion
model: opus
argument-hint: "[file paths or directory for target mode]"
user-invocable: true
---

# /verify - Independent Outcome-Based Verification

Codex verifies independently in an isolated worktree. Claude Code orchestrates
and synthesizes. Trust Score quantifies evidence from static + dynamic sources.

## Rationalization Counters

| Excuse                               | Counter                                                           |
| ------------------------------------ | ----------------------------------------------------------------- |
| "Tests pass, so the code is correct" | Your tests, your environment. Independent verification is the gap |
| "Codex will just find the same bugs" | Different model = different blind spots. That is the value        |
| "Adversarial testing takes too long" | Skip it if it does. The Trust Score degrades gracefully           |
| "The code review already covered it" | Reviews read code. Verification runs code. Different evidence     |

## Input

| Arg  | Value                   | Result                    |
| ---- | ----------------------- | ------------------------- |
| `$1` | file path or directory  | `target` mode             |
| `$1` | omitted (changes exist) | `diff` mode (auto-detect) |

## Mode Selection

| Condition                             | Mode     | Scope                       |
| ------------------------------------- | -------- | --------------------------- |
| `$1` is a file path or directory      | `target` | Specified paths             |
| No `$1`, uncommitted changes exist    | `diff`   | Changed files (uncommitted) |
| No `$1`, commits ahead of base branch | `diff`   | Changed files (branch diff) |
| No `$1`, no changes                   | —        | Abort: "Nothing to verify"  |

Base branch detection: `main` (default), override with `--base <branch>`.

## Execution

| Phase | Action                                    | Depends On |
| ----- | ----------------------------------------- | ---------- |
| 0     | Bootstrap worktree                        | —          |
| 1     | Evidence collection (parallel)            | Phase 0    |
| 2     | Deep verification (parallel)              | Phase 1    |
| 2.5   | Intent verification (adversarial results) | Phase 2    |
| 3     | Evidence synthesis                        | Phase 2.5  |
| final | Worktree cleanup                          | Always     |

### Phase 0: Bootstrap Worktree

[`references/bootstrap.md`](references/bootstrap.md) procedure.

| Constraint | Value                                                              |
| ---------- | ------------------------------------------------------------------ |
| Timeout    | 300s                                                               |
| On failure | Skip Phase 1c, 2a → static-only verification. Log reason in report |

### Phase 1: Evidence Collection (Parallel)

Launch all three in parallel via Task (background). Proceed to Phase 2 after all complete.

| Task            | Executor           | Action                               |
| --------------- | ------------------ | ------------------------------------ |
| Codex review    | Codex CLI (Bash)   | Static review of changed/target code |
| Audit reviewers | Claude Code agents | Domain-specific static analysis      |
| Outcome check   | Codex CLI (Bash)   | Build + test execution in worktree   |

#### 1a. Codex Static Review

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

#### 1b. Audit Reviewers

Use /audit file routing table (`skills/audit/SKILL.md` § File Routing). Apply
same reviewer assignments per file type.

Each reviewer spawned as standalone background Task.

| Constraint   | Value                               |
| ------------ | ----------------------------------- |
| Input        | Assigned file list + finding-schema |
| Max parallel | 10 (batch if more)                  |
| Timeout      | 120s per reviewer                   |

#### 1c. Outcome Verification (Codex exec in worktree)

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

### Phase 1→2 Transition: Finding Deduplication

1. Deduplicate by `file:line:category` across Codex and reviewer findings
2. Keep highest severity on collision
3. Pass deduplicated set to Phase 2 challenger and verifier

### Phase 2: Deep Verification (Parallel)

Launch all three in parallel:

| Task             | Executor              | Input                         |
| ---------------- | --------------------- | ----------------------------- |
| Adversarial test | Codex CLI (Bash)      | Scoped code in worktree       |
| Challenger       | devils-advocate-audit | Deduplicated Phase 1 findings |
| Verifier         | evidence-verifier     | Deduplicated Phase 1 findings |

#### 2a. Adversarial Testing (Codex exec in worktree)

Requires Phase 0 success. Skip if failed.

[`references/adversarial.md`](references/adversarial.md) protocol.

| Constraint | Value |
| ---------- | ----- |
| Timeout    | 600s  |

#### 2b. Challenger + Verifier

| Task       | subagent_type         | Input                         |
| ---------- | --------------------- | ----------------------------- |
| Challenger | devils-advocate-audit | Deduplicated Phase 1 findings |
| Verifier   | evidence-verifier     | Deduplicated Phase 1 findings |

120s timeout each. Background Tasks.

### Phase 2.5: Intent Verification

After Phase 2a returns, orchestrator triages failing tests.

[`references/adversarial.md`](references/adversarial.md) § Intent Verification verdict rules:
assertion + target code → search intent sources → verdict (exclude or promote 0.70+).

### Phase 3: Evidence Synthesis

Spawn `evidence-integrator` as background Task.

| Input               | Source                       |
| ------------------- | ---------------------------- |
| Reconciled findings | Challenger + verifier output |
| Outcome evidence    | Phase 1c build/test results  |
| Adversarial results | Phase 2.5 promoted findings  |

Returns: root causes + Trust Score + report.
[`references/trust-score.md`](references/trust-score.md) § Trust Score algorithm.

### Cleanup (Always)

Wrap all phases in try/finally to guarantee cleanup regardless of outcome.

```bash
git worktree remove <worktree-path> --force
git branch -D verify-<session-id>
```

## Report

[`references/trust-score.md`](references/trust-score.md) § Report Format.

```markdown
## Verification Report

Trust Score: NN/100
[component breakdown table]

Mode: {diff (main) | diff (uncommitted) | target}
Scope: {file count} files
Bootstrap: {success | failed: reason}

### Root Causes

[from integrator: RC-001... with description, category, findings, action]

### Findings

[High / Medium severity tables with Source, File:Line, Description, Evidence]

### Adversarial Test Results

[test name, target, result, verdict per test]

### Outcome Evidence

[build/test pass/fail with stderr excerpts]
```

## Error Handling

| Error                       | Recovery                                        |
| --------------------------- | ----------------------------------------------- |
| codex not installed         | Print install instructions, abort               |
| Bootstrap timeout (300s)    | Skip outcome + adversarial, static-only mode    |
| Codex review fails          | Log error, proceed with audit reviewers only    |
| Codex exec timeout (600s)   | Skip that phase, log in report                  |
| Reviewer stall (120s)       | Proceed without, log warning                    |
| Challenger stall            | Proceed with verifier only                      |
| Verifier stall              | Proceed with challenger only                    |
| Integrator stall            | Leader synthesizes manually (simplified report) |
| No findings from any source | Report Trust Score = 100 with "no issues found" |
| Worktree cleanup fails      | Log warning, suggest manual cleanup             |

## Escalation

| Condition                             | Action                             |
| ------------------------------------- | ---------------------------------- |
| Any reconciled finding                | Block merge, suggest `/fix`        |
| Architectural root causes found       | Suggest `/think` for design review |
| Adversarial tests reveal coverage gap | Suggest `/code` to add tests       |

## Verification

| Check                            | Required |
| -------------------------------- | -------- |
| Mode detected?                   | Yes      |
| Bootstrap attempted?             | Yes      |
| Phase 1 produced evidence?       | Yes      |
| Phase 2 challenger/verifier ran? | Yes      |
| Integrator produced report?      | Yes      |
| Trust Score displayed?           | Yes      |
| Worktree cleaned up?             | Yes      |
