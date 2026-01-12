---
description: ブランチの変更を分析し、包括的なPR説明を生成
allowed-tools: Task
model: opus
argument-hint: "[Issue参照またはコンテキスト]"
dependencies: [pr-generator, utilizing-cli-tools, managing-git-workflows]
---

# /pr - プルリクエスト説明生成

現在のブランチのすべての変更を分析し、包括的なPR説明を生成。

## 入力

- 引数なし: 現在のブランチから生成
- 引数あり: Issue参照（`#456`）または追加コンテキスト

## 実行

`pr-generator`サブエージェントに委譲（PRフォーマットと構造はそちらで定義）。

## 出力

```markdown
## プルリクエスト

| フィールド | 値              |
| ---------- | --------------- |
| タイトル   | [type]: [title] |
| Base       | main            |
| Branch     | feature/xxx     |
| Closes     | #123            |

### 概要

[2-3箇条書き]

### 変更内容

| ファイル    | 変更内容   |
| ----------- | ---------- |
| src/auth.ts | OAuth2追加 |
| src/user.ts | 型更新     |

### テスト計画

- [ ] [テスト項目]
```
