---
name: use-cli-git
description: "Git CLI ガイド。Use when: git操作, git status, git diff, HEREDOC commit, branch操作."
allowed-tools: [Bash, Read, Glob]
user-invocable: false
---

# use-cli-git

## リファレンス

| カテゴリ         | 参照先                                             |
| ---------------- | -------------------------------------------------- |
| バージョン管理   | `${CLAUDE_SKILL_DIR}/references/git-essentials.md` |

## クイックリファレンス

| 操作     | コマンド                    |
| -------- | --------------------------- |
| Status   | `git status --short`        |
| Diff     | `git diff --staged`         |
| Branch   | `git branch --show-current` |
| Log      | `git log --oneline -10`     |

## HEREDOC コミット

```bash
git commit -m "$(cat <<'EOF'
feat(auth): add OAuth authentication
EOF
)"
```
