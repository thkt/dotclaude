---
name: polish
description: Light review + cleanup with optional Codex cross-check, slop removal,
  and test audit. Use when user mentions 整理して, きれいにして, コード整理,
  slop除去, ポリッシュ, テスト整理, テスト監査, クロスチェック, crosscheck,
  Codex レビュー. Do NOT use for deep multi-reviewer audits (use /audit).
allowed-tools: Bash(codex:*), Bash(git diff:*), Bash(git log:*), Bash(git stash:*),
  Bash(git status:*), Bash(cargo test:*), Bash(npm test:*), Bash(npm run test:*),
  Bash(bun test:*), Bash(pnpm test:*), Bash(yarn test:*), Bash(make test:*),
  Bash(which:*), Read, Edit, Grep, Glob, LS, Skill, AskUserQuestion
model: opus
argument-hint: "[target scope]"
user-invocable: true
---

# /polish - Light Review + Cleanup

Structural review (simplify) + optional Codex cross-check + code cleanup + test
audit. All fixes applied directly in foreground.

## Input

- Target scope: `$1` (optional)
- If `$1` is empty → analyze `git diff HEAD` (staged + unstaged changes)

## Execution

### Phase 1: Structural review

`Skill("simplify", args: "$1")` — parallel review agents (reuse, quality,
efficiency) find and fix structural issues.

### Phase 2: Codex cross-check (optional)

Skip entirely if `which codex` fails.

| Step | Action                                                            |
| ---- | ----------------------------------------------------------------- |
| 1    | Detect mode: `git status --porcelain` → uncommitted or base       |
| 2    | Run `codex review` with detected mode (single pass)               |
| 3    | Triage: extract P1/P2 with file:line. Drop P3, skip out-of-scope  |
| 4    | Fix surviving findings (high first, then medium)                  |
| 5    | Detect test command and validate. `git stash` fix on test failure |

| Condition                       | Mode        | Command                      |
| ------------------------------- | ----------- | ---------------------------- |
| Uncommitted changes             | uncommitted | `codex review --uncommitted` |
| Commits vs base, no uncommitted | base        | `codex review --base main`   |

If both uncommitted and committed changes: use uncommitted mode.

### Phase 3: Code cleanup

Apply code-simplifier rules directly on the current diff (foreground).

Rules: `agents/enhancers/code-simplifier.md`

| Target     | Scope                                                  |
| ---------- | ------------------------------------------------------ |
| AI slop    | Redundant comments, defensive excess, over-engineering |
| Test audit | Vague names, copy-paste, over-mocking, trivial tests   |

Preservation rules in code-simplifier apply — when in doubt, keep.

## Output

```text
Phase 1 (simplify): <summary>
Phase 2 (codex): <fixed N / skipped N with reasons / not available>
Phase 3 (cleanup):
  Code: <changes with file:line>
  Tests: <changes with file:line>
  Skipped: <files not audited, with reason>
```

## Error Handling

| Error                | Action                            |
| -------------------- | --------------------------------- |
| No changes in diff   | Report "Nothing to polish"        |
| /simplify fails      | Log warning, proceed to Phase 2   |
| codex not installed  | Skip Phase 2, proceed to Phase 3  |
| codex review fails   | Log warning, proceed to Phase 3   |
| Fix causes test fail | `git stash` the fix, skip finding |
