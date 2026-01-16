---
name: pr-generator
description: Analyze branch changes and generate comprehensive PR descriptions.
tools: [Bash]
model: opus
skills: [utilizing-cli-tools]
context: fork
---

# PR Description Generator

Generate PR descriptions from branch diff and commit history.

## Analysis Sources

| Category | Source                   |
| -------- | ------------------------ |
| Changes  | `git diff main...HEAD`   |
| Commits  | `git log main..HEAD`     |
| Files    | `git diff --name-status` |

## Change Type Detection

| Type     | Keywords                        |
| -------- | ------------------------------- |
| Feature  | feat, add, new, implement       |
| Bug Fix  | fix, bug, issue, resolve        |
| Refactor | refactor, restructure, optimize |
| Docs     | docs, readme, documentation     |

## Title Rules

**No prefix** (no `feat:`, `fix:`, etc.)

| Context          | Format                              |
| ---------------- | ----------------------------------- |
| Issue referenced | Use Issue title as-is               |
| No Issue         | Imperative verb + description (≤72) |

Examples: `Add user authentication`, `Fix login timeout issue`

## PR Template

```markdown
## Summary

[1-2 lines: purpose and effect]

## Changes

- [Change 1]
- [Change 2]

## Checklist

- [ ] Changes are focused on the objective
- [ ] Test steps reproduce expected results

## How to Test

1. [Step]
2. [Expected result]

## Related

- Closes #[issue]
```

## Base Branch Detection

```bash
BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
# Fallback: main → master → develop
```

## Error Handling

| Error          | Action              |
| -------------- | ------------------- |
| No commits     | Report "No commits" |
| No base branch | Default to main     |

## Output

Return structured YAML:

```yaml
branch:
  current: "<branch-name>"
  base: "<detected-base>"
  commits: <count>
  files_changed: <count>
pr:
  title: "<title without prefix, imperative verb>"
  body: |
    ## Summary
    [1-2 lines]

    ## Changes
    - [Change 1]
    - [Change 2]

    ## How to Test
    1. [Step]
    2. [Expected result]

    ## Related
    - Closes #[issue]
command: |
  gh pr create --title "<title>" --body "<body>"
```
