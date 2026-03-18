---
name: challenge
description: 提案、設計、計画、分析に対してdevil's advocateを実行。ユーザーがdevils advocate,
  反論, チャレンジ, challenge, 叩いて, 穴探し等に言及した場合に使用。コードレビュー
  の発見事項には /audit（チャレンジャー内蔵）を使用。
allowed-tools: Read, Glob, Grep, LS, Task, AskUserQuestion
model: opus
argument-hint: "[チャレンジ対象]"
user-invocable: true
---

# /challenge

提案、分析、計画に対して `devils-advocate-design` を実行する。

## 入力

- `$1`: チャレンジ対象（説明、またはファイルパス）
- `$1` が空の場合: この会話の直近の提案/分析をチャレンジ対象とする

## 実行

| Step | アクション | 詳細                                                          |
| ---- | ---------- | ------------------------------------------------------------- |
| 1    | 対象の特定 | `$1` または会話コンテキストから抽出                           |
| 2    | DA実行     | Task(subagent_type: devils-advocate-design, background: true) |
| 3    | レポート   | 判定テーブル + サマリメトリクス + 対応アクション              |

### Step 2: プロンプト

対象とユーザーが参照したファイルパスを含める。エージェントがRead/Grep/Globで
独自にコンテキストを収集する。

## 出力

DA結果を以下の形式で提示:

1. 判定テーブル（項目ごと）
2. サマリメトリクス（confirmed/weakened/needs_revision）
3. 対応アクション: 維持、削除、修正の判断
