---
description: Analyze Git diff and generate Conventional Commits format messages
allowed-tools: [Task, AskUserQuestion, Bash]
model: opus
argument-hint: "[context or issue reference]"
dependencies: [commit-generator, utilizing-cli-tools, managing-git-workflows]
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

## Display Format

Transform agent YAML output to readable preview:

```markdown
## 📝 Commit Preview

> **<type>(<scope>)**: <description>

<body>

`<footer>`
```

## Output

**Committed**: `[short-hash]` <type>(<scope>): <description>
