# GitHub CLI (gh)

コマンドラインからのGitHub操作。

## 認証

```bash
gh auth status        # 認証ステータスを確認
gh auth login         # インタラクティブログイン
```

## プルリクエスト

### PR作成

```bash
# 基本
gh pr create --title "Title" --body "Description"

# HEREDOCボディ付き
gh pr create --title "feat: add auth" --body "$(cat <<'EOF'
## Summary
- Add OAuth authentication
- Add session management

## Test Plan
- [ ] Manual testing
- [ ] Unit tests pass
EOF
)"

# ドラフトPR
gh pr create --draft --title "WIP: feature"

# レビュアーを割り当て
gh pr create --reviewer username1,username2
```

### PRの表示と管理

| コマンド                | 目的                 |
| ----------------------- | -------------------- |
| `gh pr list`            | オープンPRをリスト   |
| `gh pr view [number]`   | PR詳細を表示         |
| `gh pr status`          | 自分のPRのステータス |
| `gh pr diff [number]`   | PRのdiffを表示       |
| `gh pr checks [number]` | CIステータスを表示   |
| `gh pr merge [number]`  | PRをマージ           |

### PRのレビュー

```bash
gh pr review --approve
gh pr review --request-changes --body "Changes needed"
gh pr review --comment --body "LGTM"
```

## Issue

### Issue作成

```bash
gh issue create --title "Bug: login fails" --body "Description"

# ラベル付き
gh issue create --title "Feature request" --label "enhancement"
```

### Issueの表示と管理

| コマンド                  | 目的                  |
| ------------------------- | --------------------- |
| `gh issue list`           | オープンIssueをリスト |
| `gh issue view [number]`  | Issue詳細を表示       |
| `gh issue status`         | アサインされたIssue   |
| `gh issue close [number]` | Issueをクローズ       |

## リポジトリ

| コマンド                   | 目的                   |
| -------------------------- | ---------------------- |
| `gh repo view`             | 現在のリポジトリを表示 |
| `gh repo clone owner/repo` | リポジトリをクローン   |
| `gh repo fork`             | リポジトリをフォーク   |

## ワークフロー & Actions

| コマンド               | 目的                       |
| ---------------------- | -------------------------- |
| `gh workflow list`     | ワークフローをリスト       |
| `gh run list`          | ワークフロー実行をリスト   |
| `gh run view [run-id]` | 実行詳細を表示             |
| `gh run watch`         | 実行中のワークフローを監視 |

## APIアクセス

```bash
# PRコメントを取得
gh api repos/{owner}/{repo}/pulls/{number}/comments

# Issue詳細を取得
gh api repos/{owner}/{repo}/issues/{number}
```

## ベストプラクティス

### 1. HEREDOCでPRテンプレート

シェルエスケープ問題を避けるため、複数行ボディには常にHEREDOCを使用。

### 2. マージ前にチェック

```bash
gh pr checks          # CIを待つ
gh pr view --json reviewDecision  # 承認を確認
gh pr merge
```

### 3. PRでIssueをリンク

```bash
gh pr create --title "fix: resolve login bug" --body "Fixes #123"
```

## コマンドとの統合

- `/pr` は `gh pr create` をHEREDOCボディで使用
- `/issue` は `gh issue create` を構造化Issueに使用
