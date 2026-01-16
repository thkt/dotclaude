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

## 実行

1. `commit-generator` に委譲（構造化YAMLを返す）
2. フォーマットしてプレビュー表示
3. ユーザーに確認
4. コミット実行

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
