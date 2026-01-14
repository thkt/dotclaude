---
description: Analyze branch changes and generate comprehensive PR description
allowed-tools: [Task, Bash]
model: opus
argument-hint: "[issue reference or context]"
dependencies: [pr-generator, utilizing-cli-tools, managing-git-workflows]
---

# /pr - Pull Request Description Generator

Analyze all changes in the current branch and generate comprehensive PR descriptions.

## Input

- No argument: generate from current branch
- Argument: issue reference (`#456`) or additional context

## Execution

1. Analyze: `git status`, `git diff`, `git log` (parallel)
2. Delegate to `pr-generator` subagent for PR description
3. Push if needed: `git push -u origin HEAD`
4. Create PR: `gh pr create --title "..." --body "..."`

## Output

```markdown
## Pull Request

| Field  | Value           |
| ------ | --------------- |
| Title  | [type]: [title] |
| Base   | main            |
| Branch | feature/xxx     |
| Closes | #123            |

### Summary

[2-3 bullet points]

### Changes

| File        | Change       |
| ----------- | ------------ |
| src/auth.ts | Add OAuth2   |
| src/user.ts | Update types |

### Test Plan

- [ ] [Test item]
```
