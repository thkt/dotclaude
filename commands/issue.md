---
description: Generate GitHub Issue with structured title and body. Use when user mentions Issue作って, Issue書いて, Issue作成, GitHub Issue.
allowed-tools: Bash(gh issue:*), Task, AskUserQuestion
model: opus
argument-hint: "[issue description]"
---

# /issue - GitHub Issue Generator

Generate well-structured GitHub Issues.

## Input

- Issue description: `$1`
- If `$1` is empty → select type via AskUserQuestion
- Type prefix: `bug`, `feature`, `docs` (optional, can be included in `$1`)

### Type Selection

| Question   | Options              |
| ---------- | -------------------- |
| Issue type | bug / feature / docs |

## Agent

| Type  | Name            | Purpose                 |
| ----- | --------------- | ----------------------- |
| Agent | issue-generator | GitHub Issue gen (fork) |

## Execution

| Step | Action                                                |
| ---- | ----------------------------------------------------- |
| 1    | `Task` with `subagent_type: issue-generator`          |
| 2    | Format and present preview                            |
| 3    | Confirm with user                                     |
| 4    | Execute: `gh issue create --title "..." --body "..."` |
| 5    | Capture issue URL from command output                 |

## Flow: Preview

```text
[Generator YAML] → [Preview] → [Confirm] → [Execute]
```

## Display Format

### Preview

```markdown
## 🎫 Issue Preview

> **<title>**

### Body

<body content>
```

### Success

**Created**: `#<number>` <title>
<issue URL>

## Verification

| Check                                                | Required |
| ---------------------------------------------------- | -------- |
| `Task` called with `subagent_type: issue-generator`? | Yes      |
