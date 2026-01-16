---
description: Analyze Git diff and generate Conventional Commits format messages
allowed-tools: [Task, AskUserQuestion, Bash]
model: opus
argument-hint: "[context or issue reference]"
---

# /commit - Git Commit Message Generator

Analyze staged changes and generate Conventional Commits messages.

## Input

- Argument: context or issue reference (optional)
- If missing: analyze staged changes only

## Execution

1. Delegate to `commit-generator` (returns structured YAML)
2. Format and present preview
3. Confirm with user
4. Execute commit

## Flow: Preview

```
[Generator YAML] → [Preview] → [Confirm] → [Execute]
```

## Display Format

### Preview

```markdown
## 📝 Commit Preview

> **<type>(<scope>)**: <description>

<body>

`<footer>`
```

### Success

**Committed**: `[short-hash]` <type>(<scope>): <description>
