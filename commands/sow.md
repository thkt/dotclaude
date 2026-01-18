---
description: Generate Statement of Work (SOW) for planning complex tasks
allowed-tools: Bash(git log:*), Bash(git diff:*), Read, Write, Glob, Grep, LS, Task
model: opus
argument-hint: "[task description]"
---

# /sow - SOW Generator

Generate sow.md for planning and analysis.

## Input

- Argument: task description (optional)
- If missing: use research context or prompt via AskUserQuestion

### Resolution Order

1. Argument provided → use as task description
2. Research context exists → use `.claude/workspace/research/*.md`
3. None → prompt via AskUserQuestion

## Execution

Generate SOW using template (ID format: I-001, AC-001, R-001).

Template: [@../templates/sow/template.md](../templates/sow/template.md)

## Output

File: `~/.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md`
