---
description: 包括的なコード品質評価のために専門レビューエージェントをオーケストレート
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(ls:*), Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task, AskUserQuestion
model: opus
argument-hint: "[対象ファイルまたはスコープ]"
---

# /audit - コード監査オーケストレーター

信頼度ベースフィルタリングで専門レビューエージェントをオーケストレート。

## 入力

- 対象スコープ: `$1`（任意）
- `$1`が空の場合 → AskUserQuestionでフォーカスを選択、ステージ済み/変更ファイルをレビュー

### 監査フォーカス

| 質問       | 選択肢                                     |
| ---------- | ------------------------------------------ |
| フォーカス | security / performance / readability / all |

## 実行

| Step | アクション                                                                            |
| ---- | ------------------------------------------------------------------------------------- |
| 1    | プロジェクトの静的解析ツールを実行（下記 Pre-flight 参照）                            |
| 2    | `Task`で`subagent_type: audit-orchestrator`（Pre-flight結果をコンテキストとして渡す） |
| 3    | オーケストレーターがエージェント実行（audit-orchestrator.md参照）                     |
| 4    | インテグレーターが結果を集約（Strong Inference: ≥3根本原因仮説 → 棄却）               |
| 5    | スナップショット保存（下記の命名規則参照）                                            |
| 6    | 前回スナップショットと比較、差分を表示                                                |
| 7    | テンプレートを使用してレポート出力                                                    |

## Pre-flight: 静的解析

エージェント起動前にプロジェクトのlint/checkツールを自動検出・実行。

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

### Step 2: 検出したランナーからlint/checkスクリプトを探索

一般的な名前: `lint`, `typecheck`, `type-check`, `check`, `analyse`, `analyze`, `static`, `phpstan`, `clippy`

フォールバック（best-effort）: ランナー未検出の場合、設定ファイルを確認（例: `tsconfig.json` → `npx tsc --noEmit`, `ruff.toml` → `ruff check`）。

### Step 3: 発見したスクリプトを実行

| ルール         | 動作                                               |
| -------------- | -------------------------------------------------- |
| ツール未検出   | Pre-flightスキップ、エージェントへ進む             |
| 非ゼロ終了     | 出力をコンテキストとして保持、監査はブロックしない |
| 複数スクリプト | 独立なものは並列実行                               |
| タイムアウト   | スクリプトごと60秒；超過時はkillして続行           |

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

| チェック                                                  | 必須 |
| --------------------------------------------------------- | ---- |
| `Task`で`subagent_type: audit-orchestrator`を呼び出した？ | Yes  |
| スナップショットを保存した？                              | Yes  |
| 差分比較を表示した？                                      | Yes  |
