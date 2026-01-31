---
description: 包括的な計画のためにSOWとSpec生成をオーケストレート
allowed-tools: SlashCommand, Read, Write, Glob, Task, TaskCreate, TaskList
model: opus
argument-hint: "[タスク説明]"
---

# /think - 計画オーケストレーター

SOWとSpec生成による実装計画のオーケストレーション。

## 入力

- タスク説明: `$1`（任意）
- `$1`が空の場合 → リサーチコンテキストを使用またはAskUserQuestionで確認

## 実行

| Step | アクション              | 出力                                   |
| ---- | ----------------------- | -------------------------------------- |
| 0    | Q&A明確化               | （不明確な場合）                       |
| 1    | 設計探索                | ≥3アプローチ + トレードオフ比較        |
| 2    | ユーザー選択            | 選択アプローチ（トレードオフ根拠付き） |
| 2.5  | ADR提案                 | （必要な場合）                         |
| 3    | /sow                    | sow.md                                 |
| 4    | /spec                   | spec.md                                |
| 5    | sow-spec-reviewer (≥90) | （オプション）                         |
| 6    | SOW → Todos             | TaskCreate                             |

## ADR提案（Step 2.5）

ユーザーがアプローチを選択した後、ADRが必要か評価する。

| 条件           | アクション                                            |
| -------------- | ----------------------------------------------------- |
| 技術的決定あり | AskUserQuestion: "ADRを作成しますか？" → Yes → `/adr` |
| 単純な機能追加 | スキップ                                              |

ADR対象となる決定:

- フレームワーク/ライブラリの選定
- アーキテクチャパターンの選択
- 非推奨化の決定
- 複数の有効な選択肢間のトレードオフ決定

## Todo生成（Step 6）

クロスセッション: `export CLAUDE_CODE_TASK_LIST_ID="[feature]-tasks"` (最大10タスク)

| ソース              | subject           | description                 | activeForm |
| ------------------- | ----------------- | --------------------------- | ---------- |
| Implementation Plan | `Phase N: [説明]` | ステップ + validates AC-XXX | `[説明]中` |
| Test Plan (HIGH)    | `Test: [説明]`    | （複雑な場合）              | `[説明]中` |

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
