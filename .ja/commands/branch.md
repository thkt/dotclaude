---
description: Git変更を分析し、適切なブランチ名を提案
allowed-tools: Task
model: opus
argument-hint: "[コンテキストまたはチケット番号]"
dependencies: [branch-generator, utilizing-cli-tools, managing-git-workflows]
---

# /branch - Gitブランチ名生成

現在のGit変更を分析し、適切なブランチ名を提案。

## 入力

- 引数: コンテキストまたはチケット番号（任意）
- 未指定時: git diff/statusのみ分析

## 実行

`branch-generator`サブエージェントに委譲（命名規約はそちらで定義）。

## 出力

```markdown
## 提案ブランチ名

| 種類  | 名前                      | 理由           |
| ----- | ------------------------- | -------------- |
| 推奨  | feature/add-oauth-support | 変更内容に適合 |
| 代替1 | feat/oauth-integration    | 短縮形         |
| 代替2 | feat/auth-provider        | より抽象的     |
```
