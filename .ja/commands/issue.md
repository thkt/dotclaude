---
description: 構造化されたタイトルと本文でGitHub Issueを生成
allowed-tools: [Task, AskUserQuestion]
model: opus
argument-hint: "[Issue説明]"
---

# /issue - GitHub Issue生成

構造化されたGitHub Issueを生成。

## 入力

- Issue説明: `$1`
- `$1`が空の場合 → AskUserQuestionでタイプを選択
- タイププレフィックス: `bug`, `feature`, `docs`（任意、`$1`に含める）

### タイプ選択

| 質問        | 選択肢               |
| ----------- | -------------------- |
| Issueタイプ | bug / feature / docs |

## Agent

| タイプ | 名前            | 目的                    |
| ------ | --------------- | ----------------------- |
| Agent  | issue-generator | GitHub Issue生成 (fork) |

## 実行

| Step | アクション                                         |
| ---- | -------------------------------------------------- |
| 1    | `Task`で`subagent_type: issue-generator`           |
| 2    | フォーマットしてプレビュー表示                     |
| 3    | ユーザーに確認                                     |
| 4    | 実行: `gh issue create --title "..." --body "..."` |
| 5    | コマンド出力からIssue URLを取得                    |

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

## 検証

| チェック                                               | 必須 |
| ------------------------------------------------------ | ---- |
| `Task`で`subagent_type: issue-generator`を呼び出した？ | Yes  |
