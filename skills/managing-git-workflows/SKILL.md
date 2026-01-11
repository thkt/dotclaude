---
name: managing-git-workflows
description: >
  Git workflow automation patterns: branch naming, commit messages, PR descriptions, issue creation.
  Provides templates and conventions for consistent Git operations.
  Triggers: git, branch, commit, pull request, PR, issue, conventional commits, branch naming.
allowed-tools: Bash, Read, Grep, Glob
user-invocable: false
---

# Managing Git Workflows

Git workflow automation patterns using Conventional Commits and consistent naming.

## Purpose

Centralize Git workflow patterns that were embedded in individual commands.
Commands become thin orchestrators that reference this skill for Git operations.

## Workflow References

| Workflow        | Reference                                                           | Command |
| --------------- | ------------------------------------------------------------------- | ------- |
| Branch Naming   | [@./references/branch-naming.md](./references/branch-naming.md)     | /branch |
| Commit Messages | [@./references/commit-messages.md](./references/commit-messages.md) | /commit |
| PR Descriptions | [@./references/pr-descriptions.md](./references/pr-descriptions.md) | /pr     |
| Issue Creation  | [@./references/issue-templates.md](./references/issue-templates.md) | /issue  |

## Quick Reference

### Branch Naming Convention

```text
<type>/<ticket>-<description>

Examples:
  feat/AUTH-123-oauth-login
  fix/BUG-456-null-pointer
  refactor/TECH-789-cleanup-utils
```

### Conventional Commits

```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

| Type       | Purpose            |
| ---------- | ------------------ |
| `feat`     | New feature        |
| `fix`      | Bug fix            |
| `docs`     | Documentation      |
| `refactor` | Code restructuring |
| `test`     | Test changes       |
| `chore`    | Build/tooling      |

### PR Description Template

```markdown
## Summary

- [1-3 bullet points]

## Changes

- [Key changes]

## Test Plan

- [ ] Unit tests added
- [ ] Manual testing done
```

### Issue Template

```markdown
## Description

[Clear description]

## Steps to Reproduce (for bugs)

1. [Step 1]
2. [Step 2]

## Expected vs Actual

- Expected: [behavior]
- Actual: [behavior]
```

## Best Practices

### Safety First

- Never use `git push --force` (use `--force-with-lease`)
- Never use `git reset --hard` without confirmation
- Always check `git status` before commit

### Atomic Commits

One logical change per commit:

```bash
# Bad
git commit -m "fix bug and add feature"

# Good
git commit -m "fix(auth): resolve token refresh"
git commit -m "feat(user): add profile page"
```

## References

### Principles (rules/)

- [@../../rules/core/AI_OPERATION_PRINCIPLES.md](../../rules/core/AI_OPERATION_PRINCIPLES.md) - Safety first

### Related Skills

- `utilizing-cli-tools` - CLI tool usage patterns

### Used by Commands

- `/branch` - Branch name suggestions
- `/commit` - Commit message generation
- `/pr` - PR description generation
- `/issue` - Issue creation
