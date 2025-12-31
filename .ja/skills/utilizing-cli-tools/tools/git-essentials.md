# Git基本操作

日常の開発ワークフローのためのコアgit操作。

## 一般的な操作

### ステージングとコミット

| コマンド | 目的 |
| --- | --- |
| `git add -A` | すべての変更をステージ |
| `git add -p` | インタラクティブステージング（ハンクを選択） |
| `git commit -m "..."` | メッセージ付きコミット |
| `git commit --amend` | 最後のコミットを修正（プッシュ前のみ！） |

### HEREDOCコミット（推奨）

複数行メッセージでシェルエスケープ問題を回避:

```bash
git commit -m "$(cat <<'EOF'
feat(component): add new Button component

- Add primary and secondary variants
- Add disabled state support
- Add loading spinner option
EOF
)"
```

### ブランチ操作

| コマンド | 目的 |
| --- | --- |
| `git checkout -b feature/xxx` | 作成して切り替え |
| `git push -u origin HEAD` | トラッキング付きでプッシュ |
| `git branch -d feature/xxx` | ローカルブランチを削除 |
| `git branch --show-current` | 現在のブランチを表示 |

### 調査

| コマンド | 目的 |
| --- | --- |
| `git log --oneline -10` | 最近の履歴 |
| `git log --oneline --graph -20` | ビジュアル履歴 |
| `git diff --stat` | 変更のサマリー |
| `git diff --staged` | ステージされた変更 |
| `git status --short` | コンパクトなステータス |
| `git blame <file>` | 行ごとの履歴 |

### スタッシュ

| コマンド | 目的 |
| --- | --- |
| `git stash` | 進行中の作業を保存 |
| `git stash pop` | 復元して削除 |
| `git stash list` | スタッシュをリスト |
| `git stash show -p` | スタッシュのdiffを表示 |

## ベストプラクティス

### 1. アトミックコミット

1コミットに1つの論理的変更。メッセージに「と」が必要なら分割。

### 2. Conventional Commits

```text
type(scope): subject

body (optional)

footer (optional)
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`

### 3. mainへのフォースプッシュは絶対禁止

```bash
# Bad: 危険
git push --force origin main

# Good: より安全な代替（featureブランチのみ）
git push --force-with-lease origin feature/xxx
```

### 4. プッシュ前チェックリスト

```bash
git status              # ステージされているものを確認
git diff --staged       # 変更をレビュー
git log --oneline -3    # コミット履歴を確認
```

## 危険な操作（確認必要）

| コマンド | リスク | より安全な代替 |
| --- | --- | --- |
| `git push --force` | 履歴書き換え | `git push --force-with-lease` |
| `git reset --hard` | データ損失 | まず `git stash` |
| `git clean -fd` | ファイル削除 | `git clean -fdn`（ドライラン優先） |
| `git checkout -- .` | 変更破棄 | 先に `git status` で確認 |

## 復旧

### 最後のコミットを取り消し（変更は維持）

```bash
git reset --soft HEAD~1
```

### 削除されたブランチを復旧

```bash
git reflog
git checkout -b recovered-branch <commit-hash>
```

### ステージされていない変更を破棄

```bash
git checkout -- <file>  # 単一ファイル
git checkout -- .       # すべてのファイル（危険！）
```

## コマンドとの統合

- `/commit` がコミットメッセージにHEREDOC形式を使用
- `/branch` がブランチ命名のためにgit statusを分析
- `/pr` がPR説明のためにgit logを使用
