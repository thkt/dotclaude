---
description: Analyze branch changes and generate comprehensive PR description. Use when user mentions PR作って, プルリクエスト, pull request, PR作成.
allowed-tools: Bash(git:*), Bash(gh:*), Task, AskUserQuestion
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
| 2    | Select base branch via AskUserQuestion                   |
| 3    | `Task` with `subagent_type: pr-generator` for PR content |
| 4    | Preview PR → AskUserQuestion: "Create this PR?"          |
| 5    | Display push command for user to run manually            |
| 6    | Create PR: `gh pr create --title "..." --body "..."`     |

### Base Branch Selection (Step 2)

| Question    | Options                     |
| ----------- | --------------------------- |
| Base branch | main / develop / [detected] |

### PR Confirmation (Step 4)

Preview → AskUserQuestion: "Create this PR?"

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

## Display Format

Preview shows title, base branch, current branch, summary bullets, and changes table.
Success: `**Created PR**: #<number> <title> <PR URL>`

## Verification

| Check                                             | Required |
| ------------------------------------------------- | -------- |
| `Task` called with `subagent_type: pr-generator`? | Yes      |
| Title has no prefix (`feat:`, `fix:`, etc.)?      | Yes      |
