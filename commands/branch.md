---
description: Analyze Git changes and suggest appropriate branch names
allowed-tools: Task
model: opus
argument-hint: "[context or ticket number]"
dependencies: [branch-generator, utilizing-cli-tools, managing-git-workflows]
---

# /branch - Git Branch Name Generator

Analyze current Git changes and suggest appropriate branch names.

## Input

- Argument: context or ticket number (optional)
- If missing: analyze git diff/status only

## Execution

Delegates to `branch-generator` subagent (naming conventions defined there).

## Output

```markdown
## Suggested Branch Names

| Type    | Name                      | Reason           |
| ------- | ------------------------- | ---------------- |
| Primary | feature/add-oauth-support | Matches changes  |
| Alt 1   | feat/oauth-integration    | Short form       |
| Alt 2   | feat/auth-provider        | More abstraction |
```
