---
name: use-context-root-cause-analysis
description: 5 Whys による根本原因分析。
when_to_use: root cause, 5 Whys, なぜなぜ分析, 根本原因, 原因分析, symptom fix, 対症療法
allowed-tools: Read Task Bash(ugrep:*) Bash(bfs:*)
context: fork
user-invocable: false
---

# 根本原因分析 - 5 Whys

## 原則

症状ではなく根本原因を修正する。対症療法は複雑性を増やし、根本原因の修正は再発を防ぐ。

## 5 Whys プロセス

「なぜ」を 5 回問う。抽象度を下げながら掘り下げる。

| ステップ | 階層               |
| -------- | ------------------ |
| 1        | 観察可能な事実     |
| 2        | 実装の詳細         |
| 3        | 設計判断           |
| 4        | アーキテクチャ制約 |
| 5        | 根本原因           |

## ヒント

| ヒント           | 説明                                       |
| ---------------- | ------------------------------------------ |
| 事実に基づく     | 仮定ではなく根拠                           |
| 早く止めない     | 最初の「なぜ」が根本原因であることは少ない |
| 深く行きすぎない | アクション可能になったら止める             |
| 検証             | 「[5] だから [4]、よって ...」で確かめる   |
| 修正を検証       | 「これで問題が防げるか?」                  |

## 出力フォーマット

| フィールド | 説明                              |
| ---------- | --------------------------------- |
| Symptom    | ユーザーから見た失敗              |
| Root cause | なぜ失敗したか (5 Whys の結果)    |
| Pattern    | Isolated / Recurring / Systematic |

### Pattern Enum

| 値         | 意味                                           |
| ---------- | ---------------------------------------------- |
| Isolated   | 単一箇所、再発経路なし                         |
| Recurring  | 近くに類似コードあり、再発の可能性             |
| Systematic | 設計に根ざす、アーキテクチャレベルの再発リスク |

利用側 (例 `/fix` の Non-obvious flow) は Pattern フィールドで分岐し、
defense-in-depth を適用するか escalate するかを判断する。

## 参照

| トピック              | ファイル                                           |
| --------------------- | -------------------------------------------------- |
| 実例                  | ${CLAUDE_SKILL_DIR}/references/five-whys.md        |
| Symptom → Root Cause | ${CLAUDE_SKILL_DIR}/references/symptom-patterns.md |
