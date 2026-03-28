---
name: crosscheck
description: Cross-model code review with Codex + Claude Code. Codex reviews, Claude Code
  triages and fixes. Use when user mentions クロスチェック, crosscheck,
  クロスモデルレビュー, Codex レビュー. Do NOT use for deep multi-reviewer
  audits (use /audit) or quick PR screening (use /preview).
allowed-tools: Bash(codex:*), Bash(git diff:*), Bash(git stash:*), Bash(git status:*),
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

| Step | Action                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------- |
| 1    | Verify codex is installed: `which codex`                                                          |
| 2    | Detect mode: `git status --porcelain` for uncommitted changes                                     |
| 3    | Get changed files (see Mode Selection below)                                                      |
| 4    | Abort if no changed files                                                                         |
| 5    | Detect test command (CLAUDE.md Commands → package.json scripts.test → Cargo.toml → Makefile test) |

If test command not detected: warn and continue (validation will be skipped).

### Mode Selection

| Condition                        | Mode        | Command                      |
| -------------------------------- | ----------- | ---------------------------- |
| Uncommitted changes exist        | uncommitted | `codex review --uncommitted` |
| No uncommitted, commits vs $BASE | base        | `codex review --base $BASE`  |

If both uncommitted AND committed changes exist: use uncommitted mode, warn that committed-only changes are not covered (suggest committing WIP first).

Changed files for triage scope:

- uncommitted mode: `git diff --name-only` + `git diff --name-only --cached` + untracked
- base mode: `git diff --name-only $BASE`

### Review Loop (max 3 iterations)

| Step | Action                                       |
| ---- | -------------------------------------------- |
| 6    | Run: codex review with detected mode         |
| 7    | Triage Codex output (see Triage Rules below) |
| 8    | If no findings survive triage → exit loop    |
| 9    | Fix each surviving finding                   |
| 10   | Validate: run test command                   |
| 11   | On test failure → revert fix, skip finding   |
| 12   | Check convergence: `git diff` from pre-fix   |
| 13   | If diff empty → exit loop (no net change)    |

### Post-loop

| Step | Action        |
| ---- | ------------- |
| 14   | Output report |

## Triage Rules

Read Codex output as text. Extract findings matching `[P1]` or `[P2]` with
file:line references.

| Rule             | Action                                            |
| ---------------- | ------------------------------------------------- |
| P3 severity      | Drop                                              |
| No file:line     | Skip, log reason: "location not identified"       |
| File not in diff | Skip, log reason: "out of scope (unchanged file)" |

Severity mapping for fix priority:

| Codex | Internal |
| ----- | -------- |
| P1    | high     |
| P2    | medium   |

Fix high findings first, then medium.

## Validation

Run project test command detected in Step 5.

| Result      | Action                                                          |
| ----------- | --------------------------------------------------------------- |
| Tests pass  | Continue to next finding or next iteration                      |
| Tests fail  | `git stash` the fix, skip finding with reason "test regression" |
| No test cmd | Skip validation, warn in report                                 |

## Report

Output at end of all iterations:

```
## Crosscheck Report

Iterations: N/3
Mode: {base ($BASE) | uncommitted}

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

| Error                  | Action                                 |
| ---------------------- | -------------------------------------- |
| codex not installed    | Print install instructions, abort      |
| codex review fails     | Print Codex error output, abort        |
| No findings in output  | Report "Codex found no issues", exit   |
| All findings skipped   | Report skipped list with reasons, exit |
| Fix causes build error | Revert fix, skip finding               |

## Escalation

| Condition                               | Action                             |
| --------------------------------------- | ---------------------------------- |
| Codex finds architectural issues        | Suggest `/think` for design review |
| Finding overlaps with /audit domain     | Suggest `/audit` for deep analysis |
| Fix requires changes outside diff scope | Skip, note in report               |
