---
name: screening-pr-review
description: >
  AI screening review for PRs - preliminary analysis before human review.
  Use when performing PR pre-review screening, or when user mentions
  スクリーニングレビュー, PRレビュー支援, レビュー前チェック, PR screening, pre-review.
allowed-tools: [Read, Grep, Glob, Bash(git:*), Bash(gh:*)]
# Command-driven (invoked by /preview)
user-invocable: false
---

# PR Screening Review

## Process

| Step | Action                      | Purpose                    |
| ---- | --------------------------- | -------------------------- |
| 1    | Gather PR context           | Background and intent      |
| 2    | Summarize changes per file  | Before/after understanding |
| 3    | Check dependency impact     | Regression risk            |
| 4    | Produce findings + comments | Reviewer-ready output      |

## PR Context Gathering

```bash
# Metadata
gh pr view --json title,body,labels,files,url $PR

# Diff
gh pr diff $PR

# Existing comments
gh pr view --comments $PR

# Inline comments
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  --jq '.[] | {file: .path, user: .user.login, comment: .body}'
```

Never include `author` in gh output fields.

## Comment Labels

| Label    | Meaning                         | Severity |
| -------- | ------------------------------- | -------- |
| `[must]` | Requires fix before merge       | High     |
| `[want]` | Should fix, not blocking        | Medium   |
| `[imo]`  | Personal opinion, take or leave | Low      |
| `[ask]`  | Question needing clarification  | -        |
| `[nits]` | Minor style/formatting issue    | Low      |
| `[info]` | Context sharing, no action      | -        |

## Comment Tone

| Rule       | Detail                             |
| ---------- | ---------------------------------- |
| Respectful | Acknowledge effort, avoid commands |
| Concise    | 3 lines max per comment            |
| Suggestive | "Consider..." not "This is wrong"  |
| Located    | Specify file:line for each comment |

## References

| Topic            | File                             |
| ---------------- | -------------------------------- |
| Review Checklist | `references/review-checklist.md` |
