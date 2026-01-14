---
description: Perform project research and technical investigation without implementation
allowed-tools: Bash(tree:*), Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(grep:*), Bash(cat:*), Bash(head:*), Bash(wc:*), Read, Glob, Grep, LS, Task
model: opus
context: fork
argument-hint: "[research topic or question]"
dependencies: [architecture-analyzer, Explore]
---

# /research - Project Research & Investigation

Investigate codebase with confidence-based findings, without implementation.

## Input

- Argument: research topic or question (required)
- If missing: prompt via AskUserQuestion

## Execution

| Phase | Agent                   | Focus                                    |
| ----- | ----------------------- | ---------------------------------------- |
| 1     | `architecture-analyzer` | Big picture: structure, tech stack       |
| 2     | `Explore`               | Detail: code paths, patterns, edge cases |
| 3     | (synthesis)             | Consolidate with ✓/→/? markers           |

Markers: [@../../rules/core/AI_OPERATION_PRINCIPLES.md](../../rules/core/AI_OPERATION_PRINCIPLES.md)

## Output

File: `.claude/workspace/research/YYYY-MM-DD-[topic].md`
Template: [@../../templates/research/template.md](../../templates/research/template.md)
