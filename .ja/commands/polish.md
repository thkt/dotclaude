---
description: AI生成スロップの除去とコード簡素化による明確性・保守性の向上
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), Read, Edit, Grep, Glob, Task, AskUserQuestion
model: opus
argument-hint: "[対象スコープ]"
---

# /polish - コード簡素化 & AIスロップ除去

コミット前にAI生成スロップを除去しコードを簡素化。

## 入力

- 対象スコープ: `$1`（任意）
- `$1`が空の場合 → `git diff main...HEAD`を分析

### Polishレベル

`conservative` | `standard` | `aggressive`

## Agent

| タイプ | 名前            | 目的                       |
| ------ | --------------- | -------------------------- |
| Agent  | code-simplifier | AIスロップ除去 (内製agent) |

## 実行

| Step | アクション                               |
| ---- | ---------------------------------------- |
| 1    | `Task`で`subagent_type: code-simplifier` |
| 2    | エージェントがAIスロップを特定・除去     |
| 3    | 簡素化を報告                             |

### 除去対象

- 不要なコメント（自明/冗長）
- 過剰な防御的コード（内部呼び出し元）
- 過剰設計（単一実装インターフェース、ラッパークラス、1回限りのヘルパー）
- コードの複雑さ（ネスト三項演算子、深いネスト）
- 無意味なテスト:
  - トートロジーテスト（`expect(x).toBe(x)`のような自己比較）
  - 重複テスト（複数テストケースで完全同一のアサーション）
  - 空/スキップテスト（`it.skip()`、アサーションなし）
  - 自己モックテスト（テスト対象モジュール自体をモック）

## 出力

```text
Polished: X件のコメント削除、Y件のヘルパーをインライン化
```

## エラーハンドリング

| エラー       | アクション              |
| ------------ | ----------------------- |
| diff変更なし | "Nothing to polish"報告 |
