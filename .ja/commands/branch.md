---
description: Git変更を分析し、適切なブランチ名を提案
allowed-tools: [Task, AskUserQuestion, Bash]
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

1. `branch-generator` に委譲（構造化YAMLを返す）
2. `AskUserQuestion` で選択肢を提示
3. 選択されたブランチを作成

## 出力

**ブランチ作成完了**: `[選択されたブランチ名]`
