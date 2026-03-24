---
name: crosscheck
description:
  Cross-model code review with Codex + Claude Code. Codex reviews, Claude Code
  triages and fixes. Use when user mentions クロスチェック, crosscheck,
  クロスモデルレビュー, Codex レビュー. Do NOT use for deep multi-reviewer
  audits (use /audit) or quick PR screening (use /preview).
allowed-tools:
  Bash(codex:*), Bash(git diff:*), Bash(git stash:*), Bash(git status:*),
  Bash(cargo test:*), Bash(npm test:*), Bash(npm run test:*), Bash(bun test:*),
  Bash(pnpm test:*), Bash(yarn test:*), Bash(make test:*), Bash(which:*),
  Edit, MultiEdit, Read, Grep, Glob, LS, AskUserQuestion
model: opus
argument-hint: "[base branch (default: main)]"
user-invocable: true
---

# /crosscheck - Cross-Model Review

Codex (gpt-5.4) reviews branch diff, Claude Code triages and fixes findings.

SOW: ~/.claude/workspace/planning/2026-03-24-crosscheck/sow.md
Spec: ~/.claude/workspace/planning/2026-03-24-crosscheck/spec.md

## Input

- Base branch: `$1` (default: `main`)

## Execution

### Pre-loop

| Step | Action                                                              |
| ---- | ------------------------------------------------------------------- |
| 1    | Verify codex is installed: `which codex`                            |
| 2    | Get changed files: `git diff --name-only $BASE`                    |
| 3    | Abort if no changed files                                           |
| 4    | Detect test command (CLAUDE.md Commands → package.json scripts.test → Cargo.toml → Makefile test) |

If test command not detected: warn and continue (validation will be skipped).

### Review Loop (max 3 iterations)

| Step | Action                                       |
| ---- | -------------------------------------------- |
| 5    | Run: `codex review --base $BASE`             |
| 6    | Triage Codex output (see Triage Rules below) |
| 7    | If no findings survive triage → exit loop     |
| 8    | Fix each surviving finding                   |
| 9    | Validate: run test command                   |
| 10   | On test failure → revert fix, skip finding   |
| 11   | Check convergence: `git diff` from pre-fix   |
| 12   | If diff empty → exit loop (no net change)    |

### Post-loop

| Step | Action         |
| ---- | -------------- |
| 13   | Output report  |

## Triage Rules

Read Codex output as text. Extract findings matching `[P1]` or `[P2]` with
file:line references.

| Rule           | Action                                               |
| -------------- | ---------------------------------------------------- |
| P3 severity    | Drop                                                 |
| No file:line   | Skip, log reason: "location not identified"          |
| File not in diff | Skip, log reason: "out of scope (unchanged file)" |

Severity mapping for fix priority:

| Codex | Internal |
| ----- | -------- |
| P1    | high     |
| P2    | medium   |

Fix high findings first, then medium.

## Convergence

| Condition              | Action                           |
| ---------------------- | -------------------------------- |
| Findings = 0           | Exit loop, report success        |
| Diff from pre-fix = 0  | Exit loop, report "no net change" |
| Iteration = 3          | Exit loop, report remaining      |

## Validation

Run project test command detected in Step 4.

| Result      | Action                                    |
| ----------- | ----------------------------------------- |
| Tests pass  | Continue to next finding or next iteration |
| Tests fail  | `git stash` the fix, skip finding with reason "test regression" |
| No test cmd | Skip validation, warn in report           |

## Report

Output at end of all iterations:

```
## Crosscheck Report

Iterations: N/3
Base: $BASE

### Fixed (N)

| # | Severity | File:Line | Description |
|---|----------|-----------|-------------|

### Skipped (N)

| # | Severity | File:Line | Description | Reason |
|---|----------|-----------|-------------|--------|

### Summary

{1-2 sentence summary of what was found and fixed}
```

## Error Handling

| Error                   | Action                                    |
| ----------------------- | ----------------------------------------- |
| codex not installed     | Print install instructions, abort         |
| codex review fails      | Print Codex error output, abort           |
| No findings in output   | Report "Codex found no issues", exit      |
| All findings skipped    | Report skipped list with reasons, exit    |
| Fix causes build error  | Revert fix, skip finding                  |

## Escalation

| Condition                              | Action                              |
| -------------------------------------- | ----------------------------------- |
| Codex finds architectural issues       | Suggest `/think` for design review  |
| Finding overlaps with /audit domain    | Suggest `/audit` for deep analysis  |
| Fix requires changes outside diff scope | Skip, note in report               |
