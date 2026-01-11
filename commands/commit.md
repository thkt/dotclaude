---
description: Analyze Git diff and generate Conventional Commits format messages
allowed-tools: Task
model: inherit
dependencies: [commit-generator, utilizing-cli-tools, managing-git-workflows]
---

# /commit - Git Commit Message Generator

Analyze staged changes and generate Conventional Commits messages.

## Workflow Reference

**Full format**: [@../skills/managing-git-workflows/references/commit-messages.md](../skills/managing-git-workflows/references/commit-messages.md)

## How It Works

Delegates to `commit-generator` subagent:

1. Analyzes git diff and status
2. Generates Conventional Commits format
3. Returns message alternatives

## Usage

```bash
/commit                            # Analyze staged changes
/commit "Related to auth flow"     # With context
/commit "#123"                     # With issue reference
```

## Conventional Commits Format

```text
<type>(<scope>): <subject>
```

| Type       | Use Case      |
| ---------- | ------------- |
| `feat`     | New feature   |
| `fix`      | Bug fix       |
| `docs`     | Documentation |
| `refactor` | Restructuring |
| `test`     | Testing       |
| `chore`    | Maintenance   |

## Subject Line Rules

1. Limit to 72 characters
2. Use imperative mood ("add" not "added")
3. No period at the end

## Context Efficiency

- No codebase files loaded
- Only git metadata analyzed
- Fast execution (<5 seconds)

## Related

- `/branch` - Branch names
- `/pr` - PR descriptions
