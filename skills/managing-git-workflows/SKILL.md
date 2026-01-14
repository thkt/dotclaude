---
name: managing-git-workflows
description: Git workflow automation patterns: branch naming, commit messages, PR descriptions.
allowed-tools: [Bash, Read, Grep, Glob]
user-invocable: false
---

# Git Workflows

Git workflow patterns using Conventional Commits and consistent naming.

## Workflow References

| Workflow        | Reference                          | Command |
| --------------- | ---------------------------------- | ------- |
| Branch Naming   | [@./references/branch-naming.md]   | /branch |
| Commit Messages | [@./references/commit-messages.md] | /commit |
| PR Descriptions | [@./references/pr-descriptions.md] | /pr     |
| Issue Creation  | [@./references/issue-templates.md] | /issue  |

## Quick Reference

### Branch Naming

```text
<type>/<ticket>-<description>
Examples: feat/AUTH-123-oauth-login, fix/BUG-456-null-pointer
```

### Conventional Commits

```text
<type>(<scope>): <description>
```

| Type       | Purpose            |
| ---------- | ------------------ |
| `feat`     | New feature        |
| `fix`      | Bug fix            |
| `docs`     | Documentation      |
| `refactor` | Code restructuring |
| `test`     | Test changes       |
| `chore`    | Build/tooling      |

### Safety Rules

- Never use `git push --force` (use `--force-with-lease`)
- Never use `git reset --hard` without confirmation
- Always check `git status` before commit
