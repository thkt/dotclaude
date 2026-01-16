---
name: utilizing-cli-tools
description: CLI tools guide for git, gh, npm, and other development tools.
allowed-tools: [Bash, Read, Glob]
user-invocable: false
---

# CLIツールガイド

## 参照

| カテゴリ       | リファレンス                 |
| -------------- | ---------------------------- |
| バージョン管理 | [@./tools/git-essentials.md] |
| GitHub         | [@./tools/gh-github-cli.md]  |
| パッケージ管理 | [@./tools/npm-scripts.md]    |
| コードレビュー | [@./tools/coderabbit.md]     |

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

## 安全

- `git push --force`は使用禁止（`--force-with-lease`を使用）
- `rm -rf`は使用禁止（`mv ~/.Trash/`を使用）
