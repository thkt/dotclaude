---
name: utilizing-cli-tools
description: >
  git, gh, npm等の開発ツールガイド。git操作、GitHub CLIコマンド、npmスクリプト
  実行時、または git操作, gh コマンド, npm スクリプト, HEREDOC コミット,
  CHANGELOG に言及時に使用。
allowed-tools: [Bash, Read, Glob]
user-invocable: false
---

# CLIツールガイド

## 参照

| カテゴリ       | リファレンス                                                        |
| -------------- | ------------------------------------------------------------------- |
| バージョン管理 | [@./references/git-essentials.md](./references/git-essentials.md)   |
| GitHub         | [@./references/gh-github-cli.md](./references/gh-github-cli.md)     |
| パッケージ管理 | [@./references/npm-scripts.md](./references/npm-scripts.md)         |
| CHANGELOG      | [@./references/changelog-tools.md](./references/changelog-tools.md) |

## クイックリファレンス

### Git

| アクション | コマンド                    |
| ---------- | --------------------------- |
| ステータス | `git status --short`        |
| Diff       | `git diff --staged`         |
| ブランチ   | `git branch --show-current` |
| ログ       | `git log --oneline -10`     |

### HEREDOCコミット

```bash
git commit -m "$(cat <<'EOF'
feat(auth): OAuth認証を追加
EOF
)"
```
