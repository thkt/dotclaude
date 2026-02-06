---
description: Remove AI-generated slop and simplify code for clarity and maintainability
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), Read, Edit, Grep, Glob, Task, AskUserQuestion
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

| Type  | Name                            | Purpose                           |
| ----- | ------------------------------- | --------------------------------- |
| Agent | code-simplifier:code-simplifier | AI slop removal (external plugin) |

## Execution

| Step | Action                                                       |
| ---- | ------------------------------------------------------------ |
| 1    | `Task` with `subagent_type: code-simplifier:code-simplifier` |
| 2    | Agent identifies and removes AI slop                         |
| 3    | Report simplifications                                       |

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

| Error                   | Action                                     |
| ----------------------- | ------------------------------------------ |
| code-simplifier unavail | Log warning, skip polish (no changes made) |
| No changes in diff      | Report "Nothing to polish"                 |
