---
name: commit
description: Git diff を分析し Conventional Commits 形式のメッセージを生成する。
when_to_use: コミットして, コミット作成, commit changes
allowed-tools: Bash(git:*) Bash(cat:*) Bash(mv:*) AskUserQuestion
model: haiku
argument-hint: "[context or issue reference]"
---

# /commit - Git コミットメッセージ生成

## 入力

- コンテキストまたは Issue 参照: `$ARGUMENTS` (任意)
- `$ARGUMENTS` が空の場合 → ステージ済み変更のみを分析

## 実行

| Step | 動作                                                                       |
| ---- | -------------------------------------------------------------------------- |
| 1    | ステージ済みを読む: `git status`, `git diff --staged` (並列)               |
| 2    | 候補を 3 つ生成 (scope や言い回しを変える。Type Detection と Rules を参照) |
| 3    | AskUserQuestion で提示 → ユーザーが選択またはカスタマイズ (Other)         |
| 4    | 選択されたコミットを実行 (sandbox 互換)                                    |

## Type 判定

diff のコンテキストから type を推定する。

| Type     | 用途                           |
| -------- | ------------------------------ |
| feat     | 新しい機能や能力               |
| fix      | バグ修正やエラー訂正           |
| refactor | 振る舞いを変えないコード再構成 |
| docs     | ドキュメントのみの変更         |
| test     | テストの追加や更新             |
| chore    | 設定、依存、メンテナンス       |
| perf     | パフォーマンス最適化           |
| style    | フォーマット、空白、lint       |
| ci       | CI/CD 設定の変更               |

判別不能な場合は `feat` をデフォルトとする。

## Rules

| Rule    | ガイドライン                                         |
| ------- | ---------------------------------------------------- |
| Subject | 72 文字以内、命令形、小文字、ピリオドなし            |
| Footer  | `BREAKING CHANGE:`, `Closes #123`, `Co-authored-by:` |

## 例

```text
feat(auth): add OAuth2 authentication support
feat(api)!: remove deprecated endpoints  # BREAKING CHANGE
```

## Sandbox 互換コミット

```bash
# 複数行: ファイルベース
cat > /tmp/claude/commit-msg.txt << 'EOF'
<message>
EOF
git commit -F /tmp/claude/commit-msg.txt
mv /tmp/claude/commit-msg.txt ~/.Trash/ 2>/dev/null || true

# 1 行: -m を複数指定
git commit -m "subject" -m "body"
```

## エラー処理

| エラー                   | 動作                     |
| ------------------------ | ------------------------ |
| ステージ済みファイルなし | "Nothing staged" を報告  |
| 空の diff                | 最小限のメッセージを返す |
| Git リポジトリでない     | "Not a git repo" を報告  |
| pre-commit 失敗          | フックエラーを報告       |

## 表示形式

### プレビュー

```markdown
## Commit Preview

> <type>(<scope>): <description>

<body>

`<footer>`
```

### 成功

Committed: `[short-hash]` <type>(<scope>): <description>
