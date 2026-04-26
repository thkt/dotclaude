---
name: use-context-root-cause-analysis
description: 5 Whys手法による根本原因分析。Use when: root cause, 5 Whys, なぜなぜ分析, 根本原因, 原因分析, symptom fix, 対症療法.
allowed-tools: [Read, Grep, Glob, Task]
context: fork
user-invocable: false
---

# 根本原因分析 - 5 Whys

## 原則

症状を直すな、根本を直せ。対症療法は複雑性を増し、根本対処は再発を防ぐ。

## 5 Whys プロセス

「なぜ」を 5 回繰り返し、抽象レベルを降りていく。

| ステップ | レベル             |
| -------- | ------------------ |
| 1        | 観察可能な事実     |
| 2        | 実装の詳細         |
| 3        | 設計上の決定       |
| 4        | アーキテクチャ制約 |
| 5        | 根本原因           |

## ヒント

| ヒント           | 説明                              |
| ---------------- | --------------------------------- |
| 事実に基づく     | 推測ではなく証拠                  |
| 早期に止めない   | 最初の「なぜ」は稀に根本原因      |
| 深く掘りすぎない | 実行可能なものに達したら止める    |
| 逆方向で検証     | 「[5] だから、したがって [4]...」 |
| 修正を検証       | 「これで問題は防げるか？」        |

## 出力フォーマット

| フィールド | 説明                                |
| ---------- | ----------------------------------- |
| Symptom    | ユーザーが観測した失敗              |
| Root cause | 失敗が起きた根本理由（5 Whys 結果） |
| Pattern    | Isolated / Recurring / Systematic   |

### Pattern enum

| 値         | 意味                                           |
| ---------- | ---------------------------------------------- |
| Isolated   | 1 箇所限定、再発経路なし                       |
| Recurring  | 近傍に類似コードあり、別 path から再発の可能性 |
| Systematic | 設計起因、アーキテクチャレベルで再発リスク     |

Consumer（例: `/fix` Non-obvious フロー）は Pattern フィールドに基づいて
defense-in-depth 適用やエスカレーションを分岐する。

## 参照

| トピック       | ファイル                                             |
| -------------- | ---------------------------------------------------- |
| 適用例         | `${CLAUDE_SKILL_DIR}/references/five-whys.md`        |
| 症状→根本原因  | `${CLAUDE_SKILL_DIR}/references/symptom-patterns.md` |
