---
name: audit
description:
  包括的なコード品質評価のために専門レビューエージェントをオーケストレート。ユーザーがレビューして,
  コードレビュー, 品質チェック, code
  review等に言及した場合に使用。PRの軽量スクリーニングには /preview を使用。
aliases: [review]
allowed-tools:
  Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*),
  Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task,
  AskUserQuestion
model: opus
argument-hint: "[対象ファイルまたはスコープ]"
user-invocable: true
---

# /audit - コード監査オーケストレーター

信頼度ベースフィルタリングで専門レビューエージェントをオーケストレート。発見事項スキーマは全findingに
`file:line` を要求する — エビデンスのないエントリは構造的に無効。

## 入力

- 対象スコープ: `$1`（任意）
- `$1` が空の場合 →
  AskUserQuestionでフォーカスを選択、ステージ済み/変更ファイルをレビュー

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

Glob対象 → ファイル数カウント → Tier選択 → ユーザーに確認。

SmallまたはMediumの場合、エスカレート選択肢を提示。

## 実行

以下のTier別ワークフローを選択。全TierでPre-flight（下記参照）を先に実行。結果表示前にスナップショットを保存。

### Small Tier（1-3 ファイル）

Leaderが全対象ファイルを読み、全ドメインを直接レビュー。出力: 発見事項YAML
→ スナップショット保存 → 差分表示。

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

Mediumでchallenger/verifierを省略: 全レビュアーが同じファイルを読むためLeaderが直接統合。Large
tierではファイルルーティングでサブセット化するため独立したchallenge/verificationが不可欠。

#### レビュアー割当

| レビュアー | subagent_type   | ドメイン                                                          |
| ---------- | --------------- | ----------------------------------------------------------------- |
| foundation | general-purpose | code-quality, duplication, progressive-enhancement, root-cause    |
| safety     | general-purpose | security, silent-failure, type-safety, type-design                |
| quality    | general-purpose | design-pattern, testability, documentation, operational-readiness |

#### 生成プロンプトテンプレート

各レビュアーのプロンプトに含める:

- 対象ファイル一覧（絶対パス）
- 担当ドメインと「何を見るか」のガイダンス
- 発見事項スキーマ（ドメイン別IDプレフィックス）
- 出力形式（YAML）
- 出力形式に `files_read` セクションを含む（実際にReadしたファイルの一覧）

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

Leaderが対象ファイルをパスで分類し、関連レビュアーのみに割当:

| ファイルパターン                | レビュアー                                             |
| ------------------------------- | ------------------------------------------------------ |
| `*.sh`                          | security, silent-failure, code-quality,                |
|                                 | duplication, operational-readiness                     |
| `*.ts, *.tsx, *.js`             | security, silent-failure, type-safety, code-quality,   |
|                                 | duplication, design-pattern, testability, performance, |
|                                 | operational-readiness                                  |
| `*.md`（エージェント定義）      | design-pattern, testability, document                  |
| `*.md`（コマンド/ドキュメント） | document, testability                                  |
| `*.yaml, *.json`                | type-design, document                                  |
| `*.css, *.html`                 | accessibility, progressive-enhancer, performance,      |
|                                 | duplication                                            |
| `test.*`, `*.test.*`            | test-coverage, testability                             |
| その他                          | code-quality, duplication, document                    |

パスによる分類: `agents/**/*.md` → エージェント定義、`skills/*/SKILL.md` または
`docs/**/*.md` → スキル/ドキュメント、その他 `*.md`
→ スキル/ドキュメント（デフォルト）。

#### Sub-reviewer 生成

各Sub-reviewerはTaskで直接生成:

- subagent_type: レビュアー名（例: `security-reviewer`）
- プロンプト: 割当ファイル一覧 + フォーカス + 発見事項スキーマ
- team_nameなし（スタンドアロン バックグラウンドエージェント）

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

スタンドアロン構成。LeaderがTask完了で結果収集、Taskプロンプトで生成。

### エラーハンドリング

| エラー               | リカバリ                                      |
| -------------------- | --------------------------------------------- |
| 監査対象ファイルなし | 「監査対象ファイルなし」を返却                |
| Reviewer 停滞        | 120秒タイムアウト；なしで続行                 |
| 不正 YAML            | スキップ、警告ログ、有効なレビュアーで続行    |
| 依存先停滞           | 依存先スキップ（例: CQ 失敗→root-cause 省略） |
| 並列数 >10           | 10 件ずつバッチ実行                           |
| Challenger 停滞      | 120秒タイムアウト；Verifier のみで続行        |
| Verifier 停滞        | 120秒タイムアウト；Challenger のみで続行      |
| Integrator 停滞      | 120秒タイムアウト；Leader が手動統合          |

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

### Step 2: 検出したランナーから lint/check スクリプトを探索

一般的な名前: `lint`, `typecheck`, `type-check`, `check`, `analyse`, `analyze`,
`static`, `phpstan`, `clippy`

フォールバック（best-effort）: ランナー未検出の場合、設定ファイルを確認し
`command -v` でツール利用可能性を検証:

| 設定ファイル                      | ツール確認                     | コマンド                      |
| --------------------------------- | ------------------------------ | ----------------------------- |
| `tsconfig.json`                   | `command -v npx`               | `npx tsc --noEmit`            |
| `ruff.toml` / pyproject内ruff     | `command -v ruff`              | `ruff check`                  |
| `.markdownlint.yaml` / `.json`    | `command -v markdownlint-cli2` | `markdownlint-cli2 "**/*.md"` |
| `biome.json` / `biome.jsonc`      | `command -v biome`             | `biome check`                 |
| `.eslintrc.*` / `eslint.config.*` | `command -v eslint`            | `eslint .`                    |

### Step 3: 発見したスクリプトを実行

| ルール         | 動作                                               |
| -------------- | -------------------------------------------------- |
| ツール未検出   | Pre-flight スキップ、エージェントへ進む            |
| 非ゼロ終了     | 出力をコンテキストとして保持、監査はブロックしない |
| 複数スクリプト | 独立なものは並列実行                               |
| タイムアウト   | スクリプトごと60秒；超過時は kill して続行         |

### Step 4: hook 出力を finding に変換

PreToolUse(Skill) hookが `additionalContext` を注入した場合（例:
ADR-0013に基づく
`claude-reviews`）、各ツールセクションをparseし、finding-schema.yamlのbase
fieldsに従って `PF-{seq}` findingに変換する。

| フィールド   | 値                               |
| ------------ | -------------------------------- |
| `finding_id` | `PF-{seq}`（全ツール通しの連番） |
| `agent`      | `pre-flight`                     |

category命名規則:

| ツール       | category パターン                                                          | デフォルト severity                                 |
| ------------ | -------------------------------------------------------------------------- | --------------------------------------------------- |
| knip         | `unused-file`, `unused-export`, `unused-dependency`, `unlisted-dependency` | `unlisted` → high, `unused-file` → medium, 他 → low |
| oxlint       | `lint/{rule-name}`                                                         | `error` → high, `warning` → medium                  |
| tsgo         | `type-error/TS{code}`                                                      | high                                                |
| react-doctor | `react/{issue-type}`                                                       | medium                                              |
| （未知）     | `preflight/{tool-name}`                                                    | low                                                 |

finding-schema.yamlの統合ルールを適用（同一パターン → 1 findingに統合）。

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
