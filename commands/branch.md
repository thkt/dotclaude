---
description: Analyze Git changes and suggest appropriate branch names
allowed-tools: Task
model: inherit
dependencies: [branch-generator, utilizing-cli-tools, managing-git-workflows]
---

# /branch - Git Branch Name Generator

Analyze current Git changes and suggest appropriate branch names.

## Workflow Reference

**Full format**: [@../skills/managing-git-workflows/references/branch-naming.md](../skills/managing-git-workflows/references/branch-naming.md)

## How It Works

Delegates to `branch-generator` subagent:

1. Analyzes git diff and status
2. Generates conventional branch names
3. Returns naming alternatives

## Usage

```bash
/branch                                    # Analyze current changes
/branch "Adding user authentication"       # With context
/branch "PROJ-456"                         # With ticket number
```

## Branch Format

```text
<type>/<scope>-<description>
<type>/<ticket>-<description>
```

| Type        | Use Case          |
| ----------- | ----------------- |
| `feature/`  | New functionality |
| `fix/`      | Bug fixes         |
| `refactor/` | Code improvements |
| `docs/`     | Documentation     |
| `test/`     | Test additions    |
| `chore/`    | Maintenance       |

## Examples

```bash
[good] feature/auth-add-oauth-support
[good] fix/PROJ-123-resolve-timeout
[bad]  new-feature (no type prefix)
[bad]  fix/bug (too vague)
```

## Context Efficiency

- No codebase files loaded
- Only git metadata analyzed
- Fast execution (<5 seconds)

## Related

- `/commit` - Commit messages
- `/pr` - PR descriptions
