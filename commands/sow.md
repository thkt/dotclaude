---
description: Generate Statement of Work (SOW) for planning complex tasks
allowed-tools: Bash(git log:*), Bash(git diff:*), Read, Write, Glob, Grep, LS, Task
model: opus
argument-hint: "[task description]"
---

# /sow - SOW Generator

Generate sow.md for planning and analysis.

## Input

- Task description: `$1` (optional)
- If `$1` is empty → check research context, then prompt via AskUserQuestion
- Resolution: `$1` > research context (`*.md`) > AskUserQuestion

## Execution

Generate SOW using template (ID format: AC-N for acceptance criteria).

Template: [@../templates/sow/template.md](../templates/sow/template.md)

## Output

File: `$HOME/.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md`
