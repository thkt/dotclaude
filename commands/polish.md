---
description: Remove AI-generated slop and simplify code for clarity and maintainability
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), Read, Edit, MultiEdit, Grep, Glob
model: opus
argument-hint: "[target scope]"
dependencies: [orchestrating-workflows, reviewing-readability]
---

# /polish - Code Simplification & AI Slop Removal

Remove AI-generated slop and simplify code before commit.

## Input

- Argument: target scope (optional)
- If missing: analyze `git diff main...HEAD`

## Execution

Analyze diff for AI patterns, apply fixes, report summary.

### Removal Targets

- Unnecessary comments (obvious/redundant)
- Excessive defensive code (internal callers)
- Over-engineering (single-impl interfaces, wrapper classes, one-time helpers)
- Code complexity (nested ternary, deep nesting)

## Output

```text
Polished: Removed X comments, inlined Y helpers
```

## IDR

- If IDR exists: append `/polish` section with removals and simplifications
- If no IDR: skip (terminal output only)
