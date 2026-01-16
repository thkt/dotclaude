---
description: Analyze Git changes and suggest appropriate branch names
allowed-tools: [Task, AskUserQuestion, Bash]
model: opus
argument-hint: "[context or ticket number]"
---

# /branch - Git Branch Name Generator

Analyze current Git changes and suggest appropriate branch names.

## Input

- Argument: context or ticket number (optional)
- If missing: analyze git diff/status only

## Execution

1. Delegate to `branch-generator` (returns structured YAML)
2. Present options via `AskUserQuestion`
3. Create selected branch

## Flow: Select

```
[Generator YAML] → [Options] → [User Selection] → [Execute]
```

## Display Format

### Selection (via AskUserQuestion)

Present generator options as choices with reasons.

### Success

**Created branch**: `[selected-branch-name]`
