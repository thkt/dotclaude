---
name: utilizing-cli-tools
description: CLI tools guide for git, gh, npm, and other development tools.
allowed-tools: [Bash, Read, Glob]
user-invocable: false
---

# CLI Tools Guide

Best practices for CLI tools in development workflows.

## Tool References

| Category           | Tools           | Reference                    |
| ------------------ | --------------- | ---------------------------- |
| Version Control    | git             | [@./tools/git-essentials.md] |
| GitHub             | gh              | [@./tools/gh-github-cli.md]  |
| Package Management | npm, yarn, pnpm | [@./tools/npm-scripts.md]    |
| Code Review        | coderabbit      | [@./tools/coderabbit.md]     |

## Quick Reference

### Git

| Action | Command                     |
| ------ | --------------------------- |
| Status | `git status --short`        |
| Diff   | `git diff --staged`         |
| Branch | `git branch --show-current` |
| Log    | `git log --oneline -10`     |

### HEREDOC Commit

```bash
git commit -m "$(cat <<'EOF'
feat(auth): add OAuth authentication
EOF
)"
```

### GitHub CLI

| Action       | Command                                   |
| ------------ | ----------------------------------------- |
| Create PR    | `gh pr create --title "..." --body "..."` |
| Create Issue | `gh issue create --title "..."`           |
| View PR      | `gh pr view [number]`                     |

### Package Managers

| Action  | npm                 | yarn             | pnpm             |
| ------- | ------------------- | ---------------- | ---------------- |
| Install | `npm install`       | `yarn`           | `pnpm install`   |
| Run     | `npm run <script>`  | `yarn <script>`  | `pnpm <script>`  |
| Add     | `npm install <pkg>` | `yarn add <pkg>` | `pnpm add <pkg>` |

## Safety Rules

- Never use `git push --force` (use `--force-with-lease`)
- Never use `git reset --hard` without confirmation
- Never use `rm -rf` (use `mv ~/.Trash/`)
