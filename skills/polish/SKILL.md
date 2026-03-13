---
name: polish
description:
  Review changed code for reuse, quality, and efficiency, then remove
  AI-generated slop and audit tests. Use when user mentions 整理して,
  きれいにして, コード整理, slop除去, ポリッシュ, テスト整理, テスト監査. Do NOT
  use for deep multi-reviewer code quality audits (use /audit instead).
allowed-tools:
  Bash(git diff:*), Bash(git log:*), Bash(git status:*), Read, Edit, Grep, Glob,
  Task, Skill
model: opus
argument-hint: "[target scope]"
user-invocable: true
---

# /polish - Code Review, Cleanup, AI Slop Removal & Test Audit

Review changed code and fix issues, then remove AI-generated slop and audit
tests.

## Input

- Target scope: `$1` (optional)
- If `$1` is empty → analyze `git diff HEAD` (staged + unstaged changes)

## Execution

| Phase | Action                                                                                                                 |
| ----- | ---------------------------------------------------------------------------------------------------------------------- |
| 1     | `Skill("simplify", args: "$1")` — 3 parallel review agents (reuse, quality, efficiency) find and fix structural issues |
| 2     | `Task` with `subagent_type: code-simplifier` — AI slop removal + test audit on the updated diff                        |
| 3     | Report combined results                                                                                                |

### Phase 1: /simplify (bundled)

Invoke via `Skill` tool. Covers:

- Reuse: existing utilities duplicated, inline common logic
- Quality: redundant state, parameter sprawl, copy-paste, leaky abstractions
- Efficiency: unnecessary work, missed concurrency, hot-path bloat, memory leaks

### Phase 2: code-simplifier (custom agent)

After /simplify completes, run code-simplifier on the remaining diff.

Covers production code slop and test audit. The agent reports both in a
structured template — empty sections are visible in the output.

See agent definition for full rules: `agents/enhancers/code-simplifier.md`

## Output

```text
Phase 1 (simplify): <reuse/quality/efficiency summary>
Phase 2 (code):  <list changes with file:line>
Phase 2 (tests): <list changes with file:line>
Phase 2 (skipped): <list files not audited, with reason>
```

## Error Handling

| Error                 | Action                           |
| --------------------- | -------------------------------- |
| No changes in diff    | Report "Nothing to polish"       |
| /simplify fails       | Log warning, proceed to Phase 2  |
| code-simplifier fails | Log warning, report Phase 1 only |
