---
name: utilizing-cli-tools
description: >
  CLI tools guide for git, gh, npm, and other development tools.
  Use when executing git commands, managing branches, or when user mentions
  CLI, コマンドライン, バージョン管理, ブランチ, コミット.
allowed-tools: [Bash, Read, Glob]
user-invocable: false
---

# CLI Tools Guide

## References

| Category           | Reference                         |
| ------------------ | --------------------------------- |
| Version Control    | `./references/git-essentials.md`  |
| GitHub             | `./references/gh-github-cli.md`   |
| Package Management | `./references/npm-scripts.md`     |
| CHANGELOG          | `./references/changelog-tools.md` |

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
