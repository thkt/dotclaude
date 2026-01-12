---
description: 包括的な計画のためにSOWとSpec生成をオーケストレート
allowed-tools: SlashCommand, Read, Write, Glob, Task
model: opus
argument-hint: "[タスク説明]"
dependencies: [sow-spec-reviewer, managing-planning]
---

# /think - 計画オーケストレーター

SOWとSpec生成による実装計画のオーケストレーション。

## 入力

- 引数: タスク説明（任意）
- 未指定時: リサーチコンテキストを使用またはAskUserQuestionで確認

## 実行

| Step | アクション              | 出力             |
| ---- | ----------------------- | ---------------- |
| 0    | Q&A明確化               | （不明確な場合） |
| 1    | 設計探索                | 4アプローチ      |
| 2    | ユーザー選択            | 選択アプローチ   |
| 3    | /sow                    | sow.md           |
| 4    | /spec                   | spec.md          |
| 5    | sow-spec-reviewer (≥90) | （オプション）   |
| 6    | サマリー生成            | summary.md       |

## 出力

```text
.claude/workspace/planning/[timestamp]-[feature]/
├── sow.md     # Statement of Work
├── spec.md    # Specification
└── summary.md # Review Summary ← ここから開始
```
