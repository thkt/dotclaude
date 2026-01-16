---
name: managing-git-workflows
description: Git workflow automation patterns: branch naming, commit messages, PR descriptions.
allowed-tools: [Bash, Read, Grep, Glob]
user-invocable: false
---

# Git Workflows

## Workflows

| Workflow        | Reference                          | Command |
| --------------- | ---------------------------------- | ------- |
| Branch Naming   | [@./references/branch-naming.md]   | /branch |
| Commit Messages | [@./references/commit-messages.md] | /commit |
| PR Descriptions | [@./references/pr-descriptions.md] | /pr     |
| Issue Creation  | [@./references/issue-templates.md] | /issue  |

## Quick Reference

Branch: `<type>/<ticket>-<description>` (e.g., feat/AUTH-123-oauth-login)

Commit: `<type>(<scope>): <description>`

| Type       | Purpose            |
| ---------- | ------------------ |
| `feat`     | New feature        |
| `fix`      | Bug fix            |
| `refactor` | Code restructuring |
| `docs`     | Documentation      |
| `test`     | Test changes       |
| `chore`    | Build/tooling      |

## Safety

- Never `git push --force` (use `--force-with-lease`)
- Never `git reset --hard` without confirmation
