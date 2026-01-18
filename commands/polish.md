---
description: Remove AI-generated slop and simplify code for clarity and maintainability
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), Read, Edit, Grep, Glob, Task
model: opus
argument-hint: "[target scope]"
---

# /polish - Code Simplification & AI Slop Removal

Remove AI-generated slop and simplify code before commit.

## Input

- Argument: target scope (optional)
- If missing: analyze `git diff main...HEAD`

## Agent

| Type  | Name                            | Purpose                |
| ----- | ------------------------------- | ---------------------- |
| Agent | code-simplifier:code-simplifier | AI slop removal (fork) |

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

## Output

```text
Polished: Removed X comments, inlined Y helpers
```

## Error Handling

| Error                   | Action                                     |
| ----------------------- | ------------------------------------------ |
| code-simplifier unavail | Log warning, skip polish (no changes made) |
| No changes in diff      | Report "Nothing to polish"                 |

Fallback: code-simplifier unavailable → exit without modifications.
Log: `⚠️ code-simplifier not available, polish skipped`

## Verification

| Check                                                                | Required |
| -------------------------------------------------------------------- | -------- |
| `Task` called with `subagent_type: code-simplifier:code-simplifier`? | Yes      |
