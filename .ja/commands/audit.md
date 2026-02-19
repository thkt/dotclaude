---
description: 包括的なコード品質評価のために専門レビューエージェントをオーケストレート。ユーザーがレビューして, コードレビュー, 品質チェック, code review等に言及した場合に使用。
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(ls:*), Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task, AskUserQuestion
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

## スコープ Tier

| Tier   | ファイル数 | アーキテクチャ                                                           |
| ------ | ---------- | ------------------------------------------------------------------------ |
| Small  | 1-3        | Leader が直接レビュー（エージェントなし）                                |
| Medium | 4-15       | 3 汎用レビュアー + Leader が統合                                         |
| Large  | 16+        | Sub-reviewer（ファイルルーティング）+ challenger + verifier + integrator |

Glob 対象 → ファイル数カウント → Tier 選択 → ユーザーに確認。

## 実行

以下の Tier 別ワークフローを選択。全 Tier で Pre-flight（下記参照）を先に実行。

**制約: ユーザーに結果を表示する前に、必ずスナップショットを保存すること。**

### Small Tier（1-3 ファイル）

Leader が全対象ファイルを読み、全ドメインを直接レビュー。
出力: 発見事項 YAML → スナップショット保存 → 差分表示。

エージェント生成なし。

### Medium Tier（4-15 ファイル）

| Step | アクション                                           |
| ---- | ---------------------------------------------------- |
| 1    | Pre-flight 静的解析                                  |
| 2    | Task（バックグラウンド）で 3 汎用レビュアーを生成    |
| 3    | 各レビュアーが担当ドメインで全対象ファイルをレビュー |
| 4    | Leader が結果を収集、統合（重複排除、根本原因）      |
| 5    | スナップショット保存                                 |
| 6    | 差分表示 + レポート                                  |

Medium で challenger/verifier を省略する理由: 4-15 ファイルでは全レビュアーが同じファイルを読むため、相互検証のコストに見合う効果が得られない。Leader が直接統合を行う。Large tier（16+）ではファイルルーティングにより各レビュアーがサブセットのみを見るため、独立した challenge/verification が不可欠。

#### レビュアー割当

| レビュアー | subagent_type   | ドメイン                                           |
| ---------- | --------------- | -------------------------------------------------- |
| foundation | general-purpose | code-quality, progressive-enhancement, root-cause  |
| safety     | general-purpose | security, silent-failure, type-safety, type-design |
| quality    | general-purpose | design-pattern, testability, documentation         |

#### 生成プロンプトテンプレート

各レビュアーのプロンプトに含める:

- 対象ファイル一覧（絶対パス）
- 担当ドメインと「何を見るか」のガイダンス
- 発見事項スキーマ（ドメイン別 ID プレフィックス）
- 出力形式（YAML）
- 「全ファイルを Read すること。スキップ不可。」

### Large Tier（16+ ファイル）

| Step | アクション                                                      |
| ---- | --------------------------------------------------------------- |
| 1    | Pre-flight 静的解析                                             |
| 2    | ファイルルーティング: 対象ファイルを分類 → 関連レビュアーに割当 |
| 3    | Task（バックグラウンド、最大 10 並列）で Sub-reviewer を生成    |
| 4    | Challenger + Verifier を生成（レビュアー完了待ち）              |
| 5    | Integrator を生成（Challenger + Verifier 完了待ち）             |
| 6    | Leader が Integrator から最終 YAML を受信                       |
| 7    | スナップショット保存                                            |
| 8    | 差分表示 + レポート                                             |

#### ファイルルーティング

Leader が対象ファイルをパスで分類し、関連レビュアーのみに割当:

| ファイルパターン                | レビュアー                                           |
| ------------------------------- | ---------------------------------------------------- |
| `*.sh`                          | security, silent-failure, code-quality               |
| `*.ts, *.tsx, *.js`             | security, silent-failure, type-safety, code-quality, |
|                                 | design-pattern, testability, performance             |
| `*.md`（エージェント定義）      | design-pattern, testability, document                |
| `*.md`（コマンド/ドキュメント） | document, testability                                |
| `*.yaml, *.json`                | type-design, document                                |
| `*.css, *.html`                 | accessibility, progressive-enhancer, performance     |
| `test.*`, `*.test.*`            | test-coverage, testability                           |
| その他                          | code-quality, document                               |

パスによる分類: `agents/**/*.md` → エージェント定義、`commands/**/*.md` または `docs/**/*.md` → コマンド/ドキュメント、その他 `*.md` → コマンド/ドキュメント（デフォルト）。

#### Sub-reviewer 生成

各 Sub-reviewer は Task で直接生成:

- subagent_type: レビュアー名（例: `security-reviewer`）
- プロンプト: 割当ファイル一覧 + フォーカス + 発見事項スキーマ
- team_name なし（スタンドアロン バックグラウンドエージェント）

#### パイプラインロール

| ロール     | subagent_type          | 目的                             |
| ---------- | ---------------------- | -------------------------------- |
| challenger | devils-advocate-audit  | 発見事項に異議（FP 削減）        |
| verifier   | evidence-verifier      | 発見事項を検証（正のエビデンス） |
| integrator | progressive-integrator | 根本原因への統合                 |

#### 順序依存関係

| レビュアー | 依存先                | 理由                    |
| ---------- | --------------------- | ----------------------- |
| root-cause | code-quality          | CQ 発見事項が入力に必要 |
| challenger | 全レビュアー          | 全発見事項が必要        |
| verifier   | 全レビュアー          | 全発見事項が必要        |
| integrator | challenger + verifier | 両方の視点が必要        |

#### ハンドオフ（スタンドアロン）

エージェントはスタンドアロン（チームではない）のため、Leader が Task output で結果収集:

| ハンドオフ          | 方法                |
| ------------------- | ------------------- |
| Reviewer → Leader   | Task 完了           |
| Leader → Challenger | Task 生成プロンプト |
| Leader → Verifier   | Task 生成プロンプト |
| Challenger → Leader | Task 完了           |
| Verifier → Leader   | Task 完了           |
| Leader → Integrator | Task 生成プロンプト |
| Integrator → Leader | Task 完了           |

### エラーハンドリング

| エラー               | リカバリ                                                    |
| -------------------- | ----------------------------------------------------------- |
| 監査対象ファイルなし | 「監査対象ファイルなし」を返却                              |
| Reviewer 停滞        | 全ピア完了時に未完了なら、そのレビュアーなしで続行          |
| 不正 YAML            | レビュアーをスキップ、警告ログ、有効なレビュアーで続行      |
| 依存先停滞           | 依存先のレビュアーをスキップ（例: CQ 失敗→root-cause 省略） |
| 並列数 >10           | 10 件ずつバッチ実行、順次待機                               |
| Challenger 停滞      | Verifier 完了時に未完了なら、Verifier のみで続行            |
| Verifier 停滞        | Challenger 完了時に未完了なら、Challenger のみで続行        |
| Integrator 停滞      | 両入力準備後に未完了なら、Leader が手動で統合               |

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

| チェック                  | Small | Medium | Large |
| ------------------------- | ----- | ------ | ----- |
| Tier ログ？               | Yes   | Yes    | Yes   |
| レビュアー完了？          | —     | Yes    | Yes   |
| Challenger 検証？         | —     | —      | Yes   |
| Verifier 検証？           | —     | —      | Yes   |
| Integrator が YAML 作成？ | —     | —      | Yes   |
| スナップショット保存？    | Yes   | Yes    | Yes   |
| 差分表示？                | Yes   | Yes    | Yes   |
