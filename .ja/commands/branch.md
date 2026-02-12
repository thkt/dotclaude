---
description: Git変更を分析し、適切なブランチ名を提案。ユーザーがブランチ名, ブランチ作成, branch name等に言及した場合に使用。
allowed-tools: Bash(git:*), Task, AskUserQuestion
model: opus
argument-hint: "[コンテキストまたはチケット番号]"
---

# /branch - Gitブランチ名生成

現在のGit変更を分析し、適切なブランチ名を提案。

## 入力

- コンテキストまたはチケット番号: `$1`（任意）
- `$1`が空の場合 → git diff/statusのみ分析

## Agent

| タイプ | 名前             | 目的                  |
| ------ | ---------------- | --------------------- |
| Agent  | branch-generator | ブランチ名生成 (fork) |

## 実行

| Step | アクション                                |
| ---- | ----------------------------------------- |
| 1    | `Task`で`subagent_type: branch-generator` |
| 2    | `AskUserQuestion`で選択肢を提示           |
| 3    | 選択されたブランチを作成                  |

## フロー: Select

```text
[Generator YAML] → [選択肢] → [ユーザー選択] → [実行]
```

## 表示形式

### 選択 (AskUserQuestion経由)

Generatorの選択肢を理由付きで提示。

### 成功

**ブランチ作成完了**: `[選択されたブランチ名]`

## 検証

| チェック                                                | 必須 |
| ------------------------------------------------------- | ---- |
| `Task`で`subagent_type: branch-generator`を呼び出した？ | Yes  |
