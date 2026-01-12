---
description: Generate GitHub Issue with structured title and body
allowed-tools: Task
model: opus
argument-hint: "[issue description] [--create]"
dependencies: [issue-generator, utilizing-cli-tools, managing-git-workflows]
---

# /issue - GitHub Issue Generator

Generate well-structured GitHub Issues.

## Input

- Argument: issue description (required)
- If missing: prompt via AskUserQuestion
- Type prefix: `bug`, `feature`, `docs` (optional)
- Flag: `--create` to create directly via `gh issue create`

## Execution

Delegates to `issue-generator` subagent (format and templates defined there).

## Output

```markdown
## GitHub Issue

| Field  | Value            |
| ------ | ---------------- |
| Title  | [type]: [title]  |
| Labels | bug, enhancement |

### Description

[Structured issue body with context]

### Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]
```
