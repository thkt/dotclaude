---
description: Orchestrate complete development cycle from research to validation
allowed-tools: SlashCommand, TodoWrite, Read, Write, Edit, MultiEdit
model: opus
argument-hint: "[feature or task description]"
dependencies: [orchestrating-workflows]
---

# /full-cycle - Complete Development Cycle

Orchestrate the complete development cycle through SlashCommand integration.

## Input

- Argument: feature or task description (required)
- If missing: prompt via AskUserQuestion
- Flags: `--skip=phase,phase`, `--start-from=phase` (optional)

## Execution

| Phase | Command   | Purpose                 | On Failure      |
| ----- | --------- | ----------------------- | --------------- |
| 1     | /research | Explore codebase        | Ask user        |
| 2     | /think    | Create SOW/Spec         | Retry or ask    |
| 2.5   | Agent     | sow-spec-reviewer (≥90) | Fix docs        |
| 3     | /code     | TDD implementation      | /fix → retry    |
| 4     | /test     | Run all tests           | /fix → retry    |
| 5     | /audit    | Code review             | Document issues |
| 6     | /validate | Check acceptance        | Report failures |
