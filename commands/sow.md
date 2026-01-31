---
description: Generate Statement of Work (SOW) for planning complex tasks
allowed-tools: Bash(git log:*), Bash(git diff:*), Read, Write, Glob, Grep, LS, Task, AskUserQuestion
model: opus
argument-hint: "[task description]"
---

# /sow - SOW Generator

Generate sow.md for planning and analysis.

## Input

- Task description: `$1` (optional)
- If `$1` is empty → check research context, then select via AskUserQuestion
- Resolution: `$1` > research context (`*.md`) > AskUserQuestion

### Description Prompt

| Question         | Options               |
| ---------------- | --------------------- |
| Task description | [free text via Other] |

## Execution

Generate SOW using template (ID format: AC-N for acceptance criteria).

Template: [@../templates/sow/template.md](../templates/sow/template.md)

## Output

File: `$HOME/.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md`
