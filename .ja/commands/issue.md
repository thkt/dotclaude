---
description: 構造化されたタイトルと本文でGitHub Issueを生成
allowed-tools: Task
model: opus
argument-hint: "[Issue説明]"
dependencies: [issue-generator, utilizing-cli-tools, managing-git-workflows]
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
4. 実行:

   ```bash
   gh issue create --title "<title>" --body "<body>"
   ```

5. コマンド出力からIssue URLを取得

## 表示形式

Agent YAML出力を読みやすいプレビューに変換:

```markdown
## 🎫 Issueプレビュー

> **<title>**

### Body

<body content>
```

## 出力

**作成完了**: `#<number>` <title>
<issue URL>
