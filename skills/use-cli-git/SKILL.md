---
name: use-cli-git
description: Git CLI guide.
when_to_use: git操作, git status, git diff, HEREDOC commit, branch操作
allowed-tools: Bash Read Glob
user-invocable: false
---

# use-cli-git

## References

| Category        | Reference                                          |
| --------------- | -------------------------------------------------- |
| Version Control | `${CLAUDE_SKILL_DIR}/references/git-essentials.md` |

## Quick Reference

| Action | Command                     |
| ------ | --------------------------- |
| Status | `git status --short`        |
| Diff   | `git diff --staged`         |
| Branch | `git branch --show-current` |
| Log    | `git log --oneline -10`     |

## HEREDOC Commit

```bash
git commit -m "$(cat <<'EOF'
feat(auth): add OAuth authentication
EOF
)"
```
