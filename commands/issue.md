---
description: Generate GitHub Issue with structured title and body
allowed-tools: Task
model: opus
argument-hint: "[issue description]"
---

# /issue - GitHub Issue Generator

Generate well-structured GitHub Issues.

## Input

- Argument: issue description (required)
- If missing: prompt via AskUserQuestion
- Type prefix: `bug`, `feature`, `docs` (optional)

## Execution

1. Delegate to `issue-generator` (returns structured YAML)
2. Format and present preview
3. Confirm with user
4. Execute: `gh issue create --title "<title>" --body "<body>"`
5. Capture issue URL from command output

## Flow: Preview

```
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
