---
name: utilizing-cli-tools
description: >
  CLI tools guide for git, gh, npm, and other development tools.
  Triggers: git, gh, npm, CLI, コマンドライン, バージョン管理, ブランチ, コミット.
allowed-tools: [Bash, Read, Glob]
user-invocable: false
---

# CLI Tools Guide

## References

| Category           | Reference                                                         |
| ------------------ | ----------------------------------------------------------------- |
| Version Control    | [@./references/git-essentials.md](./references/git-essentials.md) |
| GitHub             | [@./references/gh-github-cli.md](./references/gh-github-cli.md)   |
| Package Management | [@./references/npm-scripts.md](./references/npm-scripts.md)       |

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
