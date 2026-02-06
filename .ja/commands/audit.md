---
description: 包括的なコード品質評価のために専門レビューエージェントをオーケストレート
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(ls:*), Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task, AskUserQuestion, Teammate, SendMessage
model: opus
argument-hint: "[対象ファイルまたはスコープ]"
---

# /audit - コード監査オーケストレーター

信頼度ベースフィルタリングで専門レビューエージェントをオーケストレート。

## 入力

- 対象スコープ: `$1`（任意）
- `$1` が空の場合 → AskUserQuestion でフォーカスを選択、ステージ済み/変更ファイルをレビュー

### 監査フォーカス

| 質問       | 選択肢                                     |
| ---------- | ------------------------------------------ |
| フォーカス | security / performance / readability / all |

## 実行

| Step | アクション                                                 |
| ---- | ---------------------------------------------------------- |
| 1    | プロジェクトの静的解析ツールを実行（下記 Pre-flight 参照） |
| 2    | レビューチームを生成（下記 Team Workflow 参照）            |
| 3    | Compound Reviewer が発見事項を Integrator に DM            |
| 4    | Integrator が反論検証 + 統合 → 最終 YAML                   |
| 5    | スナップショット保存（下記の命名規則参照）                 |
| 6    | 前回スナップショットと比較、差分を表示                     |
| 7    | テンプレートを使用してレポート出力                         |

## Team Workflow

3つの Compound Reviewer と 1つの Progressive Integrator からなる協調チームを生成。

### チーム構成

```text
/audit command (LEADER)
├── reviewer-foundation  (compound-reviewer-foundation)
├── reviewer-safety      (compound-reviewer-safety)
├── reviewer-quality     (compound-reviewer-quality)
└── integrator           (progressive-integrator)
```

### ワークフロー

| Step | アクター   | アクション                                                    |
| ---- | ---------- | ------------------------------------------------------------- |
| 1    | Leader     | `Teammate.spawnTeam("audit-{timestamp}")`                     |
| 2    | Leader     | TaskCreate x 4（3 Reviewer + Integrator）                     |
| 3    | Leader     | Task で `team_name` 指定して4つの Teammate を生成             |
| 4    | Reviewers  | ドメインエージェントを内部実行、発見事項を `integrator` に DM |
| 5    | Integrator | 各バッチを反論検証（devils-advocate）、検証済み発見事項を蓄積 |
| 6    | Leader     | 全 Reviewer の完了を待機                                      |
| 7    | Integrator | 最終統合 YAML レポートを作成                                  |
| 8    | Leader     | SendMessage `shutdown_request` を全 Teammate に送信           |

### Teammate 生成

| Teammate            | subagent_type                | ドメイン                                         |
| ------------------- | ---------------------------- | ------------------------------------------------ |
| reviewer-foundation | compound-reviewer-foundation | code-quality + progressive-enhancer + root-cause |
| reviewer-safety     | compound-reviewer-safety     | security + silent-failure + type-safety          |
| reviewer-quality    | compound-reviewer-quality    | design-pattern + testability + perf + a11y + doc |
| integrator          | progressive-integrator       | devils-advocate challenge + integration          |

エージェント: [agents/teams/](../agents/teams/)

### エラーハンドリング

| エラー                | リカバリ                                                       |
| --------------------- | -------------------------------------------------------------- |
| 監査対象ファイルなし  | 「監査対象ファイルなし」メッセージを返却、チーム生成をスキップ |
| チーム作成失敗        | エラーをログ、部分的な結果を報告                               |
| Teammate 生成失敗     | 残りの Teammate で続行                                         |
| Reviewer タイムアウト | 120秒; Leader が「部分結果で続行」を Integrator に送信         |
| Teammate 無応答       | shutdown_request → 利用可能な結果で続行                        |
| DM 配信失敗           | 1回リトライ、その後 Leader が直接データを渡す                  |
| 全 Teammate 失敗      | エラーをログ、部分的な結果を報告                               |

## Pre-flight: 静的解析

エージェント起動前にプロジェクトの lint/check ツールを自動検出・実行。

### Step 1: プロジェクトルートからタスクランナーを検出

| ファイル         | ランナー                |
| ---------------- | ----------------------- |
| `package.json`   | npm / yarn / pnpm / bun |
| `composer.json`  | composer                |
| `Makefile`       | make                    |
| `Taskfile.yml`   | task                    |
| `Cargo.toml`     | cargo                   |
| `pyproject.toml` | poetry / uv / ruff      |
| `Gemfile`        | bundle exec             |

### Step 2: 検出したランナーから lint/check スクリプトを探索

一般的な名前: `lint`, `typecheck`, `type-check`, `check`, `analyse`, `analyze`, `static`, `phpstan`, `clippy`

フォールバック（best-effort）: ランナー未検出の場合、設定ファイルを確認（例: `tsconfig.json` → `npx tsc --noEmit`, `ruff.toml` → `ruff check`）。

### Step 3: 発見したスクリプトを実行

| ルール         | 動作                                               |
| -------------- | -------------------------------------------------- |
| ツール未検出   | Pre-flight スキップ、エージェントへ進む            |
| 非ゼロ終了     | 出力をコンテキストとして保持、監査はブロックしない |
| 複数スクリプト | 独立なものは並列実行                               |
| タイムアウト   | スクリプトごと60秒；超過時は kill して続行         |

## スナップショット命名規則

```bash
SNAPSHOT="$HOME/.claude/workspace/history/audit-$(date -u +%Y-%m-%d-%H%M%S).yaml"
```

出力例: `audit-2026-01-23-031812.yaml`

## テンプレート

| テンプレート                                                          | 目的                     |
| --------------------------------------------------------------------- | ------------------------ |
| [@../templates/audit/output.md](../templates/audit/output.md)         | 差分付き出力形式         |
| [@../templates/audit/snapshot.yaml](../templates/audit/snapshot.yaml) | スナップショットスキーマ |

## 検証

| チェック                            | 必須 |
| ----------------------------------- | ---- |
| 4つの Teammate でチーム生成した？   | Yes  |
| 全 Reviewer の発見事項を収集した？  | Yes  |
| Integrator が最終 YAML を作成した？ | Yes  |
| スナップショットを保存した？        | Yes  |
| 差分比較を表示した？                | Yes  |
