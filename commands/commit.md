---
description: Analyze Git diff and generate Conventional Commits format messages
allowed-tools: Task
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

Delegates to `commit-generator` subagent (Conventional Commits format defined there).

## Output

````markdown
## Commit Message

| Field   | Value                                       |
| ------- | ------------------------------------------- |
| Type    | feat / fix / refactor / docs / chore / test |
| Scope   | (component)                                 |
| Subject | short description                           |

```text
feat(auth): add OAuth2 login support

- Add Google OAuth provider
- Implement token refresh flow
- Update user session handling
```
````
