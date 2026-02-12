---
description: 包括的なコード品質評価のために専門レビューエージェントをオーケストレート。ユーザーがレビューして, コードレビュー, 品質チェック, code review等に言及した場合に使用。
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(ls:*), Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task, AskUserQuestion, TeamCreate, SendMessage
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

| Step | アクション                                                      |
| ---- | --------------------------------------------------------------- |
| 1    | プロジェクトの静的解析ツールを実行（下記 Pre-flight 参照）      |
| 2    | レビューチームを生成（下記 Team Workflow 参照）                 |
| 3    | Reviewers がエージェント実行、Council 共有ラウンド、検証者へ DM |
| 4a   | Challenger が発見事項を検証、`integrator` に DM                 |
| 4b   | Verifier が発見事項を検証、`integrator` に DM                   |
| 5    | Integrator が根本原因を統合 → 最終 YAML                         |
| 6    | スナップショット保存（下記の命名規則参照）                      |
| 7    | 前回スナップショットと比較、差分を表示                          |
| 8    | テンプレートを使用してレポート出力                              |

## Team Workflow

3つの Compound Reviewer、1つの Challenger、1つの Verifier、1つの Integrator からなる協調チームを生成。

### チーム構成

```text
/audit command (LEADER)
├── reviewer-foundation  (compound-reviewer-foundation)
├── reviewer-safety      (compound-reviewer-safety)
├── reviewer-quality     (compound-reviewer-quality)
├── challenger           (devils-advocate-audit)
├── verifier             (evidence-verifier)
└── integrator           (progressive-integrator)
```

### Council Protocol: Reviewer Council

Compound Reviewer が Challenger/Verifier に報告する前に、クロスドメインの発見事項をピア間で共有。

#### ドメイン優先度（競合解決）

発見事項が重複・競合する場合、優先度の高いドメインが優先:

| 優先度 | ドメイン   | 理由                        |
| ------ | ---------- | --------------------------- |
| 1      | Safety     | セキュリティ脆弱性 = 致命的 |
| 2      | Foundation | コード品質がすべての基盤    |
| 3      | Quality    | デザインパターン = 理想的   |

#### コミュニケーション優先度（何を共有するか）

| 優先度 | トリガー                             | アクション                        |
| ------ | ------------------------------------ | --------------------------------- |
| P1     | 特定の場所で Critical/High           | file:line + サマリーを両ピアに DM |
| P2     | 同じ課題が 3+ ファイルに存在         | パターン説明を両ピアに DM         |
| Skip   | ドメイン内のみの Low/Medium 発見事項 | 共有しない — 自身の発見事項のみ   |

#### 共有フォーマット

```text
[COUNCIL] {domain} findings for peer review:

P1 Hotspots:
- {file}:{line} — {summary} ({severity})

P2 Patterns:
- {description} ({count} instances in {scope})
```

### Spawn Context

Teammate はリーダーの会話履歴を継承しない。各生成プロンプトに含める:

| コンテキスト     | ソース                                |
| ---------------- | ------------------------------------- |
| 対象ファイル一覧 | git diff / $1 scope                   |
| 監査フォーカス   | security / performance / all          |
| Pre-flight 結果  | lint/typecheck 出力（非ゼロの場合）   |
| Council ピア     | 他の Compound Reviewer の Teammate 名 |

### ワークフロー

| Step | アクター   | アクション                                                              |
| ---- | ---------- | ----------------------------------------------------------------------- |
| 1    | Leader     | `TeamCreate("audit-{timestamp}")`                                       |
| 2    | Leader     | TaskCreate x 6（3 Reviewer + Challenger + Verifier + Integrator）       |
| 3    | Leader     | Task で `team_name` 指定して 6 つの Teammate を生成、spawn context 付き |
| 4    | Reviewers  | ドメインエージェント実行、発見事項を正規化                              |
| 4b   | Reviewers  | Council 共有ラウンド（上記 Council Protocol 参照）                      |
| 4c   | Reviewers  | エンリッチ済み発見事項を `challenger` AND `verifier` に DM              |
| 5    | Challenger | 各バッチを検証、チャレンジ済み結果を `integrator` に DM                 |
| 5b   | Verifier   | 各バッチを検証、検証結果を `integrator` に DM                           |
| 6    | Leader     | Integrator が最終 YAML を生成するのを待機                               |
| 7    | Integrator | クロスドメイン根本原因を統合、最終 YAML レポートを作成                  |
| 8    | Leader     | SendMessage `shutdown_request` を全 Teammate に送信                     |

### エラーハンドリング

| エラー                  | リカバリ                                                       |
| ----------------------- | -------------------------------------------------------------- |
| 監査対象ファイルなし    | 「監査対象ファイルなし」メッセージを返却、チーム生成をスキップ |
| チーム作成失敗          | エラーをログ、部分的な結果を報告                               |
| Teammate 生成失敗       | 残りの Teammate で続行                                         |
| Reviewer タイムアウト   | 120秒; Leader が「部分結果で続行」を Integrator に送信         |
| Challenger タイムアウト | 120秒; Leader が Integrator に Verifier のみで続行と通知       |
| Verifier タイムアウト   | 120秒; Leader が Integrator に Challenger のみで続行と通知     |
| Teammate 無応答         | shutdown_request → 利用可能な結果で続行                        |
| DM 配信失敗             | 1回リトライ、その後 Leader が直接データを渡す                  |
| 全 Teammate 失敗        | エラーをログ、部分的な結果を報告                               |

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
| 6つの Teammate でチーム生成した？   | Yes  |
| 全 Reviewer の発見事項を収集した？  | Yes  |
| Challenger が発見事項を検証した？   | Yes  |
| Verifier が検証 YAML を作成した？   | Yes  |
| Integrator が最終 YAML を作成した？ | Yes  |
| スナップショットを保存した？        | Yes  |
| 差分比較を表示した？                | Yes  |
