---
name: utilizing-cli-tools
description: git、gh、npm、その他の開発ツールのCLIツールガイド。
allowed-tools: [Bash, Read, Glob]
user-invocable: false
---

# CLIツールガイド

開発ワークフローでのCLIツールのベストプラクティス。

## ツールリファレンス

| カテゴリ       | ツール          | リファレンス                 |
| -------------- | --------------- | ---------------------------- |
| バージョン管理 | git             | [@./tools/git-essentials.md] |
| GitHub         | gh              | [@./tools/gh-github-cli.md]  |
| パッケージ管理 | npm, yarn, pnpm | [@./tools/npm-scripts.md]    |
| コードレビュー | coderabbit      | [@./tools/coderabbit.md]     |

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

### GitHub CLI

| アクション | コマンド                                  |
| ---------- | ----------------------------------------- |
| PR作成     | `gh pr create --title "..." --body "..."` |
| Issue作成  | `gh issue create --title "..."`           |
| PR表示     | `gh pr view [number]`                     |

### パッケージマネージャ

| アクション   | npm                 | yarn             | pnpm             |
| ------------ | ------------------- | ---------------- | ---------------- |
| インストール | `npm install`       | `yarn`           | `pnpm install`   |
| 実行         | `npm run <script>`  | `yarn <script>`  | `pnpm <script>`  |
| 追加         | `npm install <pkg>` | `yarn add <pkg>` | `pnpm add <pkg>` |

## 安全ルール

- `git push --force`は使用禁止（`--force-with-lease`を使用）
- `git reset --hard`は確認なしで使用禁止
- `rm -rf`は使用禁止（`mv ~/.Trash/`を使用）
