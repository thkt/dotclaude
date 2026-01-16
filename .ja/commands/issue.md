---
description: 構造化されたタイトルと本文でGitHub Issueを生成
allowed-tools: Task
model: opus
argument-hint: "[Issue説明]"
---

# /issue - GitHub Issue生成

構造化されたGitHub Issueを生成。

## 入力

- 引数: Issue説明（必須）
- 未指定時: AskUserQuestionで確認
- タイププレフィックス: `bug`, `feature`, `docs`（任意）

## 実行

1. `issue-generator` に委譲（構造化YAMLを返す）
2. フォーマットしてプレビュー表示
3. ユーザーに確認
4. 実行: `gh issue create --title "<title>" --body "<body>"`
5. コマンド出力からIssue URLを取得

## フロー: Preview

```text
[Generator YAML] → [プレビュー] → [確認] → [実行]
```

## 表示形式

### プレビュー

```markdown
## 🎫 Issueプレビュー

> **<title>**

### Body

<body content>
```

### 成功

**作成完了**: `#<number>` <title>
<issue URL>
