---
name: utilizing-cli-tools
description: CLI tools guide for git, gh, npm, and other development tools.
allowed-tools: [Bash, Read, Glob]
user-invocable: false
---

# CLI Tools Guide

## References

| Category           | Reference                    |
| ------------------ | ---------------------------- |
| Version Control    | [@./tools/git-essentials.md] |
| GitHub             | [@./tools/gh-github-cli.md]  |
| Package Management | [@./tools/npm-scripts.md]    |
| Code Review        | [@./tools/coderabbit.md]     |

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

## Safety

- Never `git push --force` (use `--force-with-lease`)
- Never `rm -rf` (use `mv ~/.Trash/`)
