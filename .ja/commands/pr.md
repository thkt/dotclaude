---
description: ブランチの変更を分析し、包括的なPR説明を生成
allowed-tools: [Task, Bash]
model: opus
argument-hint: "[Issue参照またはコンテキスト]"
---

# /pr - プルリクエスト説明生成

現在のブランチのすべての変更を分析し、包括的なPR説明を生成。

## 入力

- 引数なし: 現在のブランチから生成
- 引数あり: Issue参照（`#456`）または追加コンテキスト

## 実行

1. 分析: `git status`, `git diff`, `git log`（並行）
2. `pr-generator`サブエージェントにPR説明を委譲
3. 必要に応じてpush: `git push -u origin HEAD`
4. PR作成: `gh pr create --title "..." --body "..."`

## フロー: Preview

```text
[Generator YAML] → [プレビュー] → [確認] → [実行]
```

## 表示形式

### プレビュー

```markdown
## 🔀 PRプレビュー

| フィールド | 値          |
| ---------- | ----------- |
| タイトル   | [title]     |
| Base       | main        |
| Branch     | feature/xxx |
| Closes     | #123        |

### 概要

[2-3箇条書き]

### 変更内容

| ファイル    | 変更内容   |
| ----------- | ---------- |
| src/auth.ts | OAuth2追加 |
| src/user.ts | 型更新     |
```

### 成功

**PR作成完了**: `#<number>` <title>
<PR URL>
