---
description: 包括的な計画のためにSOWとSpec生成をオーケストレート
allowed-tools: SlashCommand, Read, Write, Glob, Task
model: opus
argument-hint: "[タスク説明]"
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

## Q&Aカテゴリ

| カテゴリ | フォーカス               |
| -------- | ------------------------ |
| 目的     | ゴール、問題、受益者     |
| ユーザー | 主要ユーザー             |
| スコープ | 含む/含まない            |
| 優先度   | MoSCoW                   |
| 成功     | 「完了」の定義           |
| 制約     | 技術的、時間的、依存関係 |
| リスク   | 既知の懸念               |

## 出力

```text
$HOME/.claude/workspace/planning/YYYY-MM-DD-[feature]/
├── sow.md     # Statement of Work
└── spec.md    # Specification
```
