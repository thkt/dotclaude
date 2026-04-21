---
name: checkout
description: Analyze Git changes and suggest appropriate branch names. Use when user mentions ブランチ名, ブランチ作成, branch name.
allowed-tools: Bash(git:*), Task, AskUserQuestion
model: opus
argument-hint: "[context or ticket number]"
user-invocable: true
---

# /checkout - Git Branch Name Generator

Analyze current Git changes and suggest appropriate branch names.

## Input

- Context or ticket number: `$1` (optional)
- If `$1` is empty → analyze git diff/status only

## Agent

| Type  | Name             | Purpose                |
| ----- | ---------------- | ---------------------- |
| Agent | branch-generator | Branch name gen (fork) |

## Execution

| Step | Action                                                           |
| ---- | ---------------------------------------------------------------- |
| 1    | `Task` with `subagent_type: branch-generator`, `mode: "dontAsk"` |
| 2    | Present options via `AskUserQuestion`                            |
| 3    | Create selected branch                                           |

## Display Format

### Selection (via AskUserQuestion)

Present generator options as choices with reasons.

### Success

Created branch: `[selected-branch-name]`

## Verification

| Check                                                 | Required |
| ----------------------------------------------------- | -------- |
| `Task` called with `subagent_type: branch-generator`? | Yes      |
