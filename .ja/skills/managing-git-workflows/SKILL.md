---
name: managing-git-workflows
description: Git workflow automation patterns: branch naming, commit messages, PR descriptions.
allowed-tools: [Bash, Read, Grep, Glob]
user-invocable: false
---

# Gitワークフロー

## ワークフロー

| ワークフロー       | リファレンス                       | コマンド |
| ------------------ | ---------------------------------- | -------- |
| ブランチ命名       | [@./references/branch-naming.md]   | /branch  |
| コミットメッセージ | [@./references/commit-messages.md] | /commit  |
| PR説明             | [@./references/pr-descriptions.md] | /pr      |
| Issue作成          | [@./references/issue-templates.md] | /issue   |

## クイックリファレンス

ブランチ: `<type>/<ticket>-<description>` (例: feat/AUTH-123-oauth-login)

コミット: `<type>(<scope>): <description>`

| タイプ     | 目的                   |
| ---------- | ---------------------- |
| `feat`     | 新機能                 |
| `fix`      | バグ修正               |
| `refactor` | コードリファクタリング |
| `docs`     | ドキュメント           |
| `test`     | テスト変更             |
| `chore`    | ビルド/ツール          |

## 安全

- `git push --force`は使用禁止（`--force-with-lease`を使用）
- `git reset --hard`は確認なしで使用禁止
