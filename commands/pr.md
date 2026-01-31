---
description: Analyze branch changes and generate comprehensive PR description
allowed-tools: [Task, Bash]
model: opus
argument-hint: "[issue reference or context]"
---

# /pr - Pull Request Description Generator

Analyze all changes in the current branch and generate comprehensive PR descriptions.

## Input

- Issue reference or context: `$1` (optional, e.g., `#456`)
- If `$1` is empty → generate from current branch only

## Agent

| Type  | Name         | Purpose                          |
| ----- | ------------ | -------------------------------- |
| Agent | pr-generator | PR description generation (fork) |

## Execution

| Step | Action                                                   |
| ---- | -------------------------------------------------------- |
| 1    | Analyze: `git status`, `git diff`, `git log` (parallel)  |
| 2    | `Task` with `subagent_type: pr-generator` for PR content |
| 3    | Display push command for user to run manually            |
| 4    | Create PR: `gh pr create --title "..." --body "..."`     |

### Push (Manual)

Never execute `git push` directly. Display the command and wait for confirmation:

```text
Run this to push: git push -u origin HEAD
```

## Rules

| Rule                | Detail                                        |
| ------------------- | --------------------------------------------- |
| Title: No prefix    | No `feat:`, `fix:`, `refactor:` etc.          |
| Body: Direct string | Avoid heredoc (`<<EOF`) - sandbox restriction |

## Flow: Preview

```text
[Generator YAML] → [Preview] → [Confirm] → [Execute]
```

## Display Format

### Preview

```markdown
## 🔀 PR Preview

| Field  | Value       |
| ------ | ----------- |
| Title  | [title]     |
| Base   | main        |
| Branch | feature/xxx |
| Closes | #123        |

### Summary

[2-3 bullet points]

### Changes

| File        | Change       |
| ----------- | ------------ |
| src/auth.ts | Add OAuth2   |
| src/user.ts | Update types |
```

### Success

**Created PR**: `#<number>` <title>
<PR URL>

## Verification

| Check                                             | Required |
| ------------------------------------------------- | -------- |
| `Task` called with `subagent_type: pr-generator`? | Yes      |
| Title has no prefix (`feat:`, `fix:`, etc.)?      | Yes      |
