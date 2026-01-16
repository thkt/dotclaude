---
description: Git変更を分析し、適切なブランチ名を提案
allowed-tools: [Task, AskUserQuestion, Bash]
model: opus
argument-hint: "[コンテキストまたはチケット番号]"
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

## フロー: Select

```text
[Generator YAML] → [選択肢] → [ユーザー選択] → [実行]
```

## 表示形式

### 選択 (AskUserQuestion経由)

Generatorの選択肢を理由付きで提示。

### 成功

**ブランチ作成完了**: `[選択されたブランチ名]`
