---
name: commit
description: Git diffを分析し、Conventional Commits形式のメッセージを生成。
when_to_use: コミットして, コミット作成, commit changes
allowed-tools: Bash(git:*) Bash(cat:*) Bash(mv:*) AskUserQuestion
model: haiku
argument-hint: "[コンテキストまたはIssue参照]"
---

# /commit - Gitコミットメッセージ生成

## 入力

- コンテキストまたはIssue参照: `$ARGUMENTS`（任意）
- `$ARGUMENTS`が空の場合 → ステージされた変更のみ分析

## 実行

| Step | アクション                                                                |
| ---- | ------------------------------------------------------------------------- |
| 1    | ステージを読み込み: `git status`, `git diff --staged`（並行）             |
| 2    | 3候補を生成（スコープ/表現を変化、Type Detection + ルール 参照）          |
| 3    | AskUserQuestionで提示 → ユーザーが選択またはカスタマイズ（Other）         |
| 4    | 選択されたメッセージでコミット実行（サンドボックス互換）                   |

## Type Detection

diffコンテキストからtypeを推論:

| Type       | 用途                              |
| ---------- | --------------------------------- |
| `feat`     | 新機能・新規能力                  |
| `fix`      | バグ修正・エラー修正              |
| `refactor` | 振る舞いを変えないコード再構成    |
| `docs`     | ドキュメントのみの変更            |
| `test`     | テスト追加・更新                  |
| `chore`    | 設定・依存・メンテナンス          |
| `perf`     | パフォーマンス最適化              |
| `style`    | フォーマット・空白・lint          |
| `ci`       | CI/CD設定変更                     |

不明な場合は `feat` をデフォルトとする。

## ルール

| ルール  | ガイドライン                                         |
| ------- | ---------------------------------------------------- |
| Subject | 72文字以下、命令形、小文字、ピリオドなし             |
| Footer  | `BREAKING CHANGE:`, `Closes #123`, `Co-authored-by:` |

## 例

```text
feat(auth): add OAuth2 authentication support
feat(api)!: remove deprecated endpoints  # BREAKING CHANGE
```

## サンドボックス互換コミット

```bash
# 複数行: ファイルベース
cat > /tmp/claude/commit-msg.txt << 'EOF'
<message>
EOF
git commit -F /tmp/claude/commit-msg.txt
mv /tmp/claude/commit-msg.txt ~/.Trash/ 2>/dev/null || true

# 単一行: 複数の -m フラグ
git commit -m "subject" -m "body"
```

## エラー処理

| エラー              | アクション                       |
| ------------------- | -------------------------------- |
| ステージなし        | "Nothing staged" を報告          |
| 空diff              | 最小メッセージを返す             |
| Gitリポジトリでない | "Gitリポジトリではない" を報告   |
| Pre-commit失敗      | hook エラーを報告                |

## 表示形式

### プレビュー

```markdown
## コミットプレビュー

> <type>(<scope>): <description>

<body>

`<footer>`
```

### 成功

コミット完了: `[short-hash]` <type>(<scope>): <description>
