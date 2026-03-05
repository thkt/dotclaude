---
name: utilizing-cli-tools
description: >
  CLI tools guide for git, gh, npm, and other development tools. Use when
  executing git operations, GitHub CLI commands, npm scripts, or when user
  mentions git操作, gh コマンド, npm スクリプト, HEREDOC コミット, CHANGELOG.
allowed-tools: [Bash, Read, Glob]
user-invocable: false
---

# CLI Tools Guide

## References

| Category           | Reference                                           |
| ------------------ | --------------------------------------------------- |
| Version Control    | `${CLAUDE_SKILL_DIR}/references/git-essentials.md`  |
| GitHub             | `${CLAUDE_SKILL_DIR}/references/gh-github-cli.md`   |
| Package Management | `${CLAUDE_SKILL_DIR}/references/npm-scripts.md`     |
| CHANGELOG          | `${CLAUDE_SKILL_DIR}/references/changelog-tools.md` |

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
