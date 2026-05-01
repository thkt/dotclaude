---
name: swarm
description: マルチエージェント swarm による大規模並列実装。Architect + QA + Implementer(s) が peer DM で協働する。
when_to_use: 大規模実装, 並列実装, swarm, チーム実装
allowed-tools: Skill Bash(npm run) Bash(npm run:*) Bash(yarn run) Bash(yarn run:*) Bash(yarn:*) Bash(pnpm run) Bash(pnpm run:*) Bash(pnpm:*) Bash(bun run) Bash(bun run:*) Bash(bun:*) Bash(make:*) Bash(git status:*) Bash(git log:*) Bash(git diff:*) Edit MultiEdit Write Read Glob Grep LS Task TaskCreate TaskList TaskUpdate TaskGet SendMessage TeamCreate TeamDelete AskUserQuestion
model: opus
argument-hint: "[implementation description]"
---

# /swarm - 大規模並列実装

大規模実装のためのマルチエージェント swarm。5 ファイル未満のタスクは /code を使う。

## 使用条件

以下のいずれかに該当するときに /swarm を使う。それ以外は /code を使う。

| 条件            | /swarm |
| --------------- | ------ |
| ファイル数 >= 5 | Yes    |
| マルチドメイン  | Yes    |
| 設計判断が多い  | Yes    |

## Leader 原則

Leader はオーケストレーターであり、ワーカーではない。実質的な作業は Architect、QA、Implementer(s) 間の peer DM を通じて行われる。

### 制限

- 理解のためのコード読みは行わない
- 契約 (contracts) やアーキテクチャの設計は行わない
- コードのデバッグや修正は行わない
- 技術的な質問への回答は行わない

### 責務

- ユーザーとのインターフェース
- QG コマンドを機械的に実行
- 結果をエージェントに転送
- チームのライフサイクル管理
- 進捗の追跡と報告 (下記 Progress Tracking 参照)

## 入力

実装の説明: `$ARGUMENTS` (必須、空ならプロンプト)

## SOW コンテキスト

${CLAUDE_SKILL_DIR}/../_lib/sow-resolution.md を参照

## チーム構成

| エージェント   | subagent_type       | 責務                               | Bash | SendMessage | Model  |
| -------------- | ------------------- | ---------------------------------- | ---- | ----------- | ------ |
| Leader         | (self)              | ユーザー対応、QG、ライフサイクル   | Yes  | broadcast   | opus   |
| Architect      | architect-feature   | コードベース分析、契約 (contracts) | No   | peer DM     | opus   |
| QA             | team-qa             | 品質観察 (ノンブロッキング)        | No   | peer DM     | sonnet |
| Implementer(s) | team-implementation | RGRC 実装                          | Yes  | peer DM     | opus   |

### Model 制約

Haiku はチームエージェントから除外する。多段階の指示の追従や shutdown プロトコルの処理を確実に行えないため。Team Architecture の Model 列が各エージェントのモデルを規定する。

## Context Contracts

ハンドオフ構造を持つ peer DM トランスポート (Spawn Context、Architect Output、Implementer Started/Assignment/Completion)。

参照: ${CLAUDE_SKILL_DIR}/references/contracts.md#context-contracts

## 実行

| Phase | アクション                  | 詳細                                                                           |
| ----- | --------------------------- | ------------------------------------------------------------------------------ |
| 0     | SOW 検出                    | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-0-sow-detection              |
| 1     | チーム編成 + アーキテクチャ | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-1-team-setup--architecture   |
| 2     | 分割の承認                  | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-2-decomposition-approval     |
| 3     | テスト生成                  | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-3-test-generation            |
| 4     | ファイル割当                | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-4-file-assignment            |
| 5     | RGRC 実装                   | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-5-rgrc-implementation        |
| 6     | 統合 + 品質ゲート           | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-6-integration--quality-gates |
| 7     | サマリ                      | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-7-summary                    |

### 並列スポーンルール

Phase 5 はすべての Implementer を 1 つのレスポンス内の並行 Task 呼び出しでスポーンしなければならない。1 ユニットにつき 1 Task 呼び出し。逐次スポーンは swarm モデルを台無しにし、所要時間が線形に伸びる。

## エラー処理

| シナリオ                         | アクション                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| ユーザーがキャンセル             | 全エージェントに `shutdown_request`、TeamDelete                                         |
| Contract が根本的に誤り          | Implementer をシャットダウン、Architect が再設計                                        |
| Implementer の started DM なし   | 120s タイムアウト、シャットダウン、再スポーン (リトライ最大 1 回、超過時はエスカレート) |
| Implementer が作業中に停止       | Leader が git status で worktree を確認、再スポーン (リトライ最大 1 回)                 |
| QG が 3 回失敗                   | 詳細とともにユーザーへエスカレート                                                      |
| エージェントの Bash 権限ブロック | worktree 隔離された Implementer には `mode: "dontAsk"` を使用                           |
| test-gen のタイムアウト          | Leader が直接テストを生成                                                               |
| test-gen が 0 テスト生成         | Spec の存在を確認、ユーザーに問う                                                       |
| シャットダウンが応答しない       | tool params を明示して再試行、team ディレクトリを `~/.Trash/` に移動                    |

## 進捗追跡

Leader は主要イベント (Phase 4 開始、Implementer の started/completion、merge/QG 結果) で進捗テーブルを報告する。

参照: ${CLAUDE_SKILL_DIR}/references/contracts.md#progress-tracking

## Abort / Rollback

Phase ごとのリカバリ手順。

参照: ${CLAUDE_SKILL_DIR}/references/contracts.md#abort--rollback
