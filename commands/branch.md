---
description: Analyze Git changes and suggest appropriate branch names
allowed-tools: Bash(git:*), Task, AskUserQuestion
model: opus
argument-hint: "[context or ticket number]"
---

# /branch - Git Branch Name Generator

Analyze current Git changes and suggest appropriate branch names.

## Input

- Context or ticket number: `$1` (optional)
- If `$1` is empty → analyze git diff/status only

## Agent

| Type  | Name             | Purpose                |
| ----- | ---------------- | ---------------------- |
| Agent | branch-generator | Branch name gen (fork) |

## Execution

| Step | Action                                        |
| ---- | --------------------------------------------- |
| 1    | `Task` with `subagent_type: branch-generator` |
| 2    | Present options via `AskUserQuestion`         |
| 3    | Create selected branch                        |

## Flow: Select

```text
[Generator YAML] → [Options] → [User Selection] → [Execute]
```

## Display Format

### Selection (via AskUserQuestion)

Present generator options as choices with reasons.

### Success

**Created branch**: `[selected-branch-name]`

## Verification

| Check                                                 | Required |
| ----------------------------------------------------- | -------- |
| `Task` called with `subagent_type: branch-generator`? | Yes      |
