---
description: Git diffを分析し、Conventional Commits形式のメッセージを生成
allowed-tools: Task
model: opus
argument-hint: "[コンテキストまたはIssue参照]"
dependencies: [commit-generator, utilizing-cli-tools, managing-git-workflows]
---

# /commit - Gitコミットメッセージ生成

ステージされた変更を分析し、Conventional Commitsメッセージを生成。

## 入力

- 引数: コンテキストまたはIssue参照（任意）
- 未指定時: ステージされた変更のみ分析

## 実行

`commit-generator`サブエージェントに委譲（Conventional Commits形式はそちらで定義）。

## 出力

````markdown
## コミットメッセージ

| フィールド | 値                                          |
| ---------- | ------------------------------------------- |
| Type       | feat / fix / refactor / docs / chore / test |
| Scope      | (コンポーネント)                            |
| Subject    | 短い説明                                    |

```text
feat(auth): add OAuth2 login support

- Add Google OAuth provider
- Implement token refresh flow
- Update user session handling
```
````
