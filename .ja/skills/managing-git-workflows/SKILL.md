---
name: managing-git-workflows
description: Gitワークフロー自動化パターン：ブランチ命名、コミットメッセージ、PR説明。
allowed-tools: [Bash, Read, Grep, Glob]
user-invocable: false
---

# Gitワークフロー

Conventional Commitsと一貫した命名を使用したGitワークフローパターン。

## ワークフローリファレンス

| ワークフロー       | リファレンス                       | コマンド |
| ------------------ | ---------------------------------- | -------- |
| ブランチ命名       | [@./references/branch-naming.md]   | /branch  |
| コミットメッセージ | [@./references/commit-messages.md] | /commit  |
| PR説明             | [@./references/pr-descriptions.md] | /pr      |
| Issue作成          | [@./references/issue-templates.md] | /issue   |

## クイックリファレンス

### ブランチ命名

```text
<type>/<ticket>-<description>
例: feat/AUTH-123-oauth-login, fix/BUG-456-null-pointer
```

### Conventional Commits

```text
<type>(<scope>): <description>
```

| タイプ     | 目的                   |
| ---------- | ---------------------- |
| `feat`     | 新機能                 |
| `fix`      | バグ修正               |
| `docs`     | ドキュメント           |
| `refactor` | コードリファクタリング |
| `test`     | テスト変更             |
| `chore`    | ビルド/ツール          |

### 安全ルール

- `git push --force`は使用禁止（`--force-with-lease`を使用）
- `git reset --hard`は確認なしで使用禁止
- コミット前に必ず`git status`を確認
