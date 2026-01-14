---
description: Generate GitHub Issue with structured title and body
allowed-tools: Task
model: opus
argument-hint: "[issue description]"
dependencies: [issue-generator, utilizing-cli-tools, managing-git-workflows]
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
4. Execute:

   ```bash
   gh issue create --title "<title>" --body "<body>"
   ```

5. Capture issue URL from command output

## Display Format

Transform agent YAML output to readable preview:

```markdown
## 🎫 Issue Preview

> **<title>**

### Body

<body content>
```

## Output

**Created**: `#<number>` <title>
<issue URL>
