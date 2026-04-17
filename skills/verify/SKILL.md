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

| Phase | Action                                    | Depends On | Detail                                                  |
| ----- | ----------------------------------------- | ---------- | ------------------------------------------------------- |
| 0     | Bootstrap worktree                        | —          | [references/bootstrap.md](references/bootstrap.md)      |
| 1     | Evidence collection (parallel)            | Phase 0    | [references/phase-details.md](references/phase-details.md) § Phase 1 |
| 2     | Deep verification (parallel)              | Phase 1    | [references/phase-details.md](references/phase-details.md) § Phase 2 |
| 2.5   | Intent verification (adversarial results) | Phase 2    | [references/phase-details.md](references/phase-details.md) § Phase 2.5 |
| 3     | Evidence synthesis                        | Phase 2.5  | [references/phase-details.md](references/phase-details.md) § Phase 3 |
| final | Worktree cleanup                          | Always     | [references/phase-details.md](references/phase-details.md) § Cleanup |

Phase 0 constraints: Timeout 300s. On failure: skip Phase 1c, 2a → static-only
verification. Log reason in report.

Parallel spawn rule: Phase 1 and Phase 2 must issue all Task / Bash / Codex
exec calls concurrently within a single response. Sequential invocation
negates the fan-out and doubles wall time.

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
