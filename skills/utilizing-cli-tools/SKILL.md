---
name: utilizing-cli-tools
description: >
  CLI tools guide for git, gh, npm, and other development tools.
  Best practices for command-line operations in development workflows.
  Triggers: CLI, command line, git, gh, npm, yarn, pnpm, terminal,
  コマンドライン, ターミナル, GitHub CLI, package manager,
  パッケージマネージャ, Conventional Commits, HEREDOC, シェル.
allowed-tools: Bash, Read, Glob
user-invocable: false
---

# CLI Tools Guide

Best practices for CLI tool usage in development workflows.

## Purpose

Provide guidance on effective CLI tool usage for:

- Version control operations (git)
- GitHub interactions (gh)
- Package management (npm, yarn, pnpm)
- External code review (coderabbit)

## Tool Categories

| Category           | Tools           | Reference                                               |
| ------------------ | --------------- | ------------------------------------------------------- |
| Version Control    | git             | [@./tools/git-essentials.md](./tools/git-essentials.md) |
| GitHub             | gh              | [@./tools/gh-github-cli.md](./tools/gh-github-cli.md)   |
| Package Management | npm, yarn, pnpm | [@./tools/npm-scripts.md](./tools/npm-scripts.md)       |
| Code Review        | coderabbit      | [@./tools/coderabbit.md](./tools/coderabbit.md)         |

## Quick Reference

### Git

| Action           | Command                     |
| ---------------- | --------------------------- |
| Status           | `git status --short`        |
| Diff             | `git diff --staged`         |
| Branch           | `git branch --show-current` |
| Log              | `git log --oneline -10`     |
| Commit (HEREDOC) | See below                   |

**HEREDOC Commit (avoids shell escaping issues)**:

```bash
git commit -m "$(cat <<'EOF'
feat(auth): add OAuth authentication

- Add Google OAuth provider
- Add session management
EOF
)"
```

### GitHub CLI (gh)

| Action       | Command                                      |
| ------------ | -------------------------------------------- |
| Create PR    | `gh pr create --title "..." --body "..."`    |
| Create Issue | `gh issue create --title "..." --body "..."` |
| View PR      | `gh pr view [number]`                        |
| PR Status    | `gh pr status`                               |
| Check Runs   | `gh pr checks`                               |

### npm/yarn/pnpm

| Action     | npm                    | yarn                | pnpm                |
| ---------- | ---------------------- | ------------------- | ------------------- |
| Install    | `npm install`          | `yarn`              | `pnpm install`      |
| Run script | `npm run <script>`     | `yarn <script>`     | `pnpm <script>`     |
| Add dep    | `npm install <pkg>`    | `yarn add <pkg>`    | `pnpm add <pkg>`    |
| Dev dep    | `npm install -D <pkg>` | `yarn add -D <pkg>` | `pnpm add -D <pkg>` |

## Best Practices

### 1. Atomic Commits

One logical change per commit:

```bash
# Bad: Multiple unrelated changes
git commit -m "fix bug and add feature and update docs"

# Good: One change at a time
git commit -m "fix(auth): resolve token refresh issue"
git commit -m "feat(user): add profile settings page"
```

### 2. Conventional Commits

Format: `type(scope): description`

| Type       | Purpose            |
| ---------- | ------------------ |
| `feat`     | New feature        |
| `fix`      | Bug fix            |
| `docs`     | Documentation      |
| `refactor` | Code restructuring |
| `test`     | Test changes       |
| `chore`    | Build/tooling      |

### 3. Safety First

**Never run without confirmation**:

- `git push --force` (use `--force-with-lease` instead)
- `git reset --hard`
- `rm -rf` (use `mv ~/.Trash/` instead)

## References

### Principles (rules/)

- [@../../rules/core/AI_OPERATION_PRINCIPLES.md](../../rules/core/AI_OPERATION_PRINCIPLES.md) - Safety first operations

### Related Skills

- `generating-tdd-tests` - TDD with CLI test runners
- `creating-hooks` - Git hooks configuration

### Used by Commands

- `/commit` - Generate Conventional Commits format
- `/pr` - Create PR and push
- `/branch` - Suggest branch names
- `/issue` - Create GitHub issues
- `/rabbit` - CodeRabbit AI review
