---
description: 包括的な計画のためにSOWとSpec生成をオーケストレート
allowed-tools: Skill, Read, Write, Glob, Task, TaskCreate, TaskList, AskUserQuestion, TeamCreate, SendMessage
model: opus
argument-hint: "[タスク説明]"
---

# /think - 計画オーケストレーター

多角的な設計探索、SOWとSpec生成による実装計画のオーケストレーション。

## 入力

- タスク説明: `$1`（任意）
- `$1` が空の場合 → リサーチコンテキストを使用または AskUserQuestion で確認

## 実行

| Step | アクション              | 出力                                   |
| ---- | ----------------------- | -------------------------------------- |
| 0    | Q&A明確化               | （不明確な場合）                       |
| 1    | Think チームを生成      | 5つのエージェントチーム                |
| 2    | Thinker がアプローチ探索| 3つの異なる視点からの提案              |
| 3    | Challenger が提案を検証 | 弱点を指摘されたチャレンジ済み提案     |
| 4    | Synthesizer が比較作成  | 比較表 + 推奨                          |
| 5    | ユーザー選択            | 選択アプローチ（トレードオフ根拠付き） |
| 5.5  | ADR提案                 | （必要な場合）                         |
| 6    | /sow                    | sow.md                                 |
| 7    | /spec                   | spec.md                                |
| 8    | sow-spec-reviewer (≥90) | （オプション）                         |
| 9    | SOW → Todos             | TaskCreate                             |

## Team Workflow（Step 1-4）

3つの Thinker、1つの Challenger、1つの Synthesizer からなる協調チームを生成。

### チーム構成

```text
/think command (LEADER)
├── thinker-pragmatist   (thinker-pragmatist)
├── thinker-architect    (thinker-architect)
├── thinker-advocate     (thinker-advocate)
├── challenger           (devils-advocate)
└── synthesizer          (think-synthesizer)
```

### ワークフロー

| Step | アクター    | アクション                                                   |
| ---- | ----------- | ------------------------------------------------------------ |
| 1    | Leader      | `TeamCreate("think-{timestamp}")`                            |
| 2    | Leader      | TaskCreate x 5（3 Thinker + Challenger + Synthesizer）       |
| 3    | Leader      | Task で `team_name` 指定して5つの Teammate を生成            |
| 4    | Thinkers    | コードベースを探索、提案を `challenger` に DM                |
| 5    | Challenger  | 各提案をチャレンジ、チャレンジ済み結果を `synthesizer` に DM |
| 6    | Leader      | 全 Thinker の完了を待機                                      |
| 7    | Synthesizer | 比較表 + 推奨を作成、Leader に DM                            |
| 8    | Leader      | 統合結果をユーザーに提示し選択を促す                         |
| 9    | Leader      | SendMessage `shutdown_request` を全 Teammate に送信          |

### Teammate 生成

| Teammate           | subagent_type      | 役割                                   |
| ------------------ | ------------------ | -------------------------------------- |
| thinker-pragmatist | thinker-pragmatist | シンプルさ、出荷速度、YAGNI            |
| thinker-architect  | thinker-architect  | 拡張性、パターン、クリーン設計         |
| thinker-advocate   | thinker-advocate   | ユーザー/開発者体験、APIエルゴノミクス |
| challenger         | devils-advocate    | 提案をチャレンジし、隠れた弱点を露出   |
| synthesizer        | think-synthesizer  | チャレンジ済み提案を統合、推奨         |

エージェント: [agents/thinkers/](../agents/thinkers/), [agents/critics/](../agents/critics/), [agents/teams/](../agents/teams/)

### エラーハンドリング

| エラー               | リカバリ                                                     |
| -------------------- | ------------------------------------------------------------ |
| チーム作成失敗       | 単一エージェントによる設計探索にフォールバック（元のフロー） |
| Thinker 生成失敗     | 残りの Thinker で続行                                        |
| Thinker タイムアウト | 120秒; Leader が利用可能な提案で続行                         |
| Challenger 失敗      | Leader が提案を直接 Synthesizer に渡す                       |
| Synthesizer 失敗     | Leader が think-synthesizer.md の出力テンプレートで統合      |
| 全 Teammate 失敗     | 単一エージェントによる設計探索にフォールバック               |

## 複雑度ゲート

単純なタスクではチームワークフローをスキップ:

| 条件                     | アクション                           |
| ------------------------ | ------------------------------------ |
| 単一ファイル変更         | チームスキップ、単一エージェント探索 |
| 明確な実装パス           | チームスキップ、直接 /sow に進む     |
| ユーザーが「計画だけ」   | チームスキップ、単一エージェント探索 |
| 複数ファイルまたは不明確 | チームワークフローを使用             |

## ADR提案（Step 5.5）

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

## Todo生成（Step 9）

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

## 検証

| チェック                                 | 必須 |
| ---------------------------------------- | ---- |
| 5つの Teammate で Think チーム生成した？ | Yes  |
| 統合比較を作成した？                     | Yes  |
| ユーザーがアプローチを選択した？         | Yes  |
| sow.md を生成した？                      | Yes  |
| spec.md を生成した？                     | Yes  |
| Todo を作成した（TaskCreate）？          | Yes  |
