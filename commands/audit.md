---
description: Orchestrate specialized review agents for comprehensive code quality assessment
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[target files or scope]"
dependencies: [audit-orchestrator, orchestrating-workflows]
---

# /audit - Code Review Orchestrator

Orchestrate specialized review agents with confidence-based filtering.

## Input

- Argument: target scope (optional)
- If missing: review staged/modified files (via `git diff --name-only`)

## Execution

Delegates to `audit-orchestrator` subagent (15 agents: Core 8 + pr-review-toolkit 4 + Production 3).

## Output

```markdown
# Review Summary

- Files: [count] | Critical [X] / High [X] / Medium [X]

## Critical Issues

[issues with file:line]

## Medium Priority

[issues with reasoning]

## Recommended Actions

1. Immediate [✓]
2. Next Sprint [→]
```

## IDR

- If IDR exists: append `/audit` section with review summary, issues, recommendations
- If no IDR: skip (terminal output only)
