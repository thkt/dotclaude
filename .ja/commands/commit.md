---
description: Git diffを分析し、Conventional Commits形式のメッセージを生成
allowed-tools: [Task, AskUserQuestion, Bash]
model: opus
argument-hint: "[コンテキストまたはIssue参照]"
---

# /commit - Gitコミットメッセージ生成

ステージされた変更を分析し、Conventional Commitsメッセージを生成。

## 入力

- 引数: コンテキストまたはIssue参照（任意）
- 未指定時: ステージされた変更のみ分析

## Agent

| タイプ | 名前             | 目的                            |
| ------ | ---------------- | ------------------------------- |
| Agent  | commit-generator | Conventional Commits生成 (fork) |

## 実行

| Step | アクション                                 |
| ---- | ------------------------------------------ |
| 1    | `Task`で`subagent_type: commit-generator`  |
| 2    | フォーマットしてプレビュー表示             |
| 3    | ユーザーに確認                             |
| 4    | コミット実行（サンドボックス互換の方法で） |

### サンドボックス互換コミット

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

## フロー: Preview

```text
[Generator YAML] → [プレビュー] → [確認] → [実行]
```

## 表示形式

### プレビュー

```markdown
## 📝 コミットプレビュー

> **<type>(<scope>)**: <description>

<body>

`<footer>`
```

### 成功

**コミット完了**: `[short-hash]` <type>(<scope>): <description>

## 検証

| チェック                                                | 必須 |
| ------------------------------------------------------- | ---- |
| `Task`で`subagent_type: commit-generator`を呼び出した？ | Yes  |
