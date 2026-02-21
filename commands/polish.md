---
description: Remove AI-generated slop and simplify code for clarity and maintainability. Use when user mentions 整理して, きれいにして, コード整理, slop除去, ポリッシュ.
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git worktree *), Bash(git merge *), Bash(git branch *), Read, Edit, Grep, Glob, Task, AskUserQuestion
model: opus
argument-hint: "[target scope]"
---

# /polish - Code Simplification & AI Slop Removal

Remove AI-generated slop and simplify code before commit.

## Input

- Target scope: `$1` (optional)
- If `$1` is empty → analyze `git diff main...HEAD`

### Polish Level

`conservative` | `standard` | `aggressive`

## Agent

| Type  | Name            | Purpose                          |
| ----- | --------------- | -------------------------------- |
| Agent | code-simplifier | AI slop removal (internal agent) |

## Execution

| Step | Action                                                           |
| ---- | ---------------------------------------------------------------- |
| 1    | Record current worktrees: `git worktree list`                    |
| 2    | `Task` with `subagent_type: code-simplifier`                     |
| 3    | Find new worktree branch: `git worktree list` (diff from step 1) |
| 4    | Show diff: `git diff HEAD...<worktree-branch> --stat` + summary  |
| 5    | `AskUserQuestion`: Apply / Discard                               |
| 6a   | Apply → `git merge <worktree-branch> --no-commit` → report       |
| 6b   | Discard → cleanup only                                           |
| 7    | Cleanup: `git worktree remove <path> && git branch -D <branch>`  |

### Removal Targets

- Unnecessary comments (obvious/redundant)
- Excessive defensive code (internal callers)
- Over-engineering (single-impl interfaces, wrapper classes, one-time helpers)
- Code complexity (nested ternary, deep nesting)
- Meaningless tests:
  - Tautology tests (self-comparing assertions like `expect(x).toBe(x)`)
  - Duplicate tests (identical assertions in multiple test cases)
  - Empty/skipped tests (`it.skip()`, tests without assertions)
  - Self-mocking tests (mocking the module under test)

## Output

```text
Polished: Removed X comments, inlined Y helpers
```

## Error Handling

| Error              | Action                     |
| ------------------ | -------------------------- |
| No changes in diff | Report "Nothing to polish" |
