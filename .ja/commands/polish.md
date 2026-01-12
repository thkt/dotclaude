---
description: AI生成スロップの除去とコード簡素化による明確性・保守性の向上
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), Read, Edit, MultiEdit, Grep, Glob
model: opus
argument-hint: "[対象スコープ]"
dependencies: [orchestrating-workflows, reviewing-readability]
---

# /polish - コード簡素化 & AIスロップ除去

コミット前にAI生成スロップを除去しコードを簡素化。

## 入力

- 引数: 対象スコープ（任意）
- 未指定時: `git diff main...HEAD`を分析

## 実行

diffをAIパターンで分析、修正適用、サマリー報告。

### 除去対象

- 不要なコメント（自明/冗長）
- 過剰な防御的コード（内部呼び出し元）
- 過剰設計（単一実装インターフェース、ラッパークラス、1回限りのヘルパー）
- コードの複雑さ（ネスト三項演算子、深いネスト）

## 出力

```text
Polished: X件のコメント削除、Y件のヘルパーをインライン化
```

## IDR

- IDR存在時: `/polish`セクションを追記（削除と簡素化）
- IDRなし: スキップ（ターミナル出力のみ）
