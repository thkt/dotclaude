---
description: 構造化されたタイトルと本文でGitHub Issueを生成
allowed-tools: Task
model: opus
argument-hint: "[Issue説明] [--create]"
dependencies: [issue-generator, utilizing-cli-tools, managing-git-workflows]
---

# /issue - GitHub Issue生成

構造化されたGitHub Issueを生成。

## 入力

- 引数: Issue説明（必須）
- 未指定時: AskUserQuestionで確認
- タイププレフィックス: `bug`, `feature`, `docs`（任意）
- フラグ: `--create` で`gh issue create`により直接作成

## 実行

`issue-generator`サブエージェントに委譲（フォーマットとテンプレートはそちらで定義）。

## 出力

```markdown
## GitHub Issue

| フィールド | 値               |
| ---------- | ---------------- |
| タイトル   | [type]: [title]  |
| ラベル     | bug, enhancement |

### 説明

[コンテキスト付き構造化Issue本文]

### 受け入れ基準

- [ ] [基準1]
- [ ] [基準2]
```
