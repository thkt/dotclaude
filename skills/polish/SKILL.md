---
name: polish
description: Light review + cleanup with optional Codex + CodeRabbit cross-check,
  slop removal, and test audit. Use when user mentions 整理して, きれいにして,
  コード整理, slop除去, ポリッシュ, テスト整理, テスト監査, クロスチェック,
  crosscheck, Codex レビュー, CodeRabbit. Do NOT use for deep multi-reviewer
  audits (use /audit).
allowed-tools: Bash(codex:*), Bash(coderabbit:*), Bash(git diff:*), Bash(git log:*), Bash(git stash:*),
  Bash(git status:*), Bash(cargo test:*), Bash(npm test:*), Bash(npm run test:*),
  Bash(bun test:*), Bash(pnpm test:*), Bash(yarn test:*), Bash(make test:*),
  Bash(which:*), Read, Edit, Grep, Glob, LS, Skill, AskUserQuestion
model: opus
argument-hint: "[target scope]"
user-invocable: true
---

# /polish - Light Review + Cleanup

Structural review (simplify) + optional Codex + CodeRabbit cross-check + code
cleanup + test audit. All fixes applied directly in foreground.

## Input

- Target scope: `$ARGUMENTS` (optional)
- If `$ARGUMENTS` is empty → analyze `git diff HEAD` (staged + unstaged changes)

## Execution

### Phase 1: Structural review

`Skill("simplify", args: "$ARGUMENTS")` — parallel review agents (reuse, quality,
efficiency) find and fix structural issues.

### Phase 2: Cross-check (parallel, optional)

Run Codex and CodeRabbit CLI in parallel. Each tool skips independently if unavailable. If both skip, proceed to Phase 3.

| Tool       | Focus                            | Skip condition                                 |
| ---------- | -------------------------------- | ---------------------------------------------- |
| Codex      | Logic, architecture, data flow   | `which codex` fails                            |
| CodeRabbit | Security, mechanical bugs (P1)   | `which coderabbit` fails OR `coderabbit auth status` fails |

| Step | Action                                                                                 |
| ---- | -------------------------------------------------------------------------------------- |
| 1    | Detect mode: `git status --porcelain` → uncommitted or base                            |
| 2    | Run both tools in parallel with detected mode (single pass each)                       |
| 3    | Dedupe findings across tools by file:line                                              |
| 4    | Triage: keep Codex P1/P2, keep CodeRabbit critical only. Drop Phase 3 territory        |
| 5    | Fix surviving findings (high first, then medium)                                       |
| 6    | Detect test command and validate. `git stash` fix on test failure                      |

| Condition                       | Mode        | Codex                        | CodeRabbit                                       |
| ------------------------------- | ----------- | ---------------------------- | ------------------------------------------------ |
| Uncommitted changes             | uncommitted | `codex review --uncommitted` | `coderabbit review --agent --type uncommitted`   |
| Commits vs base, no uncommitted | base        | `codex review --base main`   | `coderabbit review --agent --type committed`     |

If both uncommitted and committed changes: use uncommitted mode.

CodeRabbit drops (Phase 3 territory, not applied here): naming, formatting, readability, AI slop. Users should set `profile: chill` in `.coderabbit.yaml` to reduce free-tier rate-limit pressure.

### Phase 3: Code cleanup

Apply enhancer-code rules directly on the current diff (foreground).

Rules: `agents/enhancers/enhancer-code.md`

| Target     | Scope                                                  |
| ---------- | ------------------------------------------------------ |
| AI slop    | Redundant comments, defensive excess, over-engineering |
| Test audit | Vague names, copy-paste, over-mocking, trivial tests   |

Preservation rules in enhancer-code apply — when in doubt, keep.

## Output

```text
Phase 1 (simplify): <summary>
Phase 2 (codex): <fixed N / skipped N with reasons / not available>
Phase 2 (coderabbit): <fixed N / skipped N with reasons / not available>
Phase 3 (cleanup):
  Code: <changes with file:line>
  Tests: <changes with file:line>
  Skipped: <files not audited, with reason>
```

## Error Handling

| Error                       | Action                             |
| --------------------------- | ---------------------------------- |
| No changes in diff          | Report "Nothing to polish"         |
| /simplify fails             | Log warning, proceed to Phase 2    |
| codex not installed         | Skip Codex only, keep CodeRabbit   |
| codex review fails          | Log warning, proceed               |
| coderabbit not installed    | Skip CodeRabbit only, keep Codex   |
| coderabbit auth status fails | Skip CodeRabbit only, keep Codex  |
| coderabbit review fails     | Log warning, proceed               |
| Both Phase 2 tools skipped  | Proceed directly to Phase 3        |
| Fix causes test fail        | `git stash` the fix, skip finding  |
