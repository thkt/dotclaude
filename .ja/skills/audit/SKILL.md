---
name: audit
description: "包括的なコード品質評価のために専門レビューエージェントをオーケストレート。Use when: レビューして, コードレビュー, 品質チェック, code review, quality check. Do NOT use for quick PR screening (use /preview instead)."
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*),
  Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task,
  AskUserQuestion
model: opus
argument-hint: "[対象ファイルまたはスコープ]"
user-invocable: true
---

# /audit - コード監査オーケストレーター

信頼度ベースフィルタリングで専門レビューエージェントをオーケストレート。発見事項スキーマは全 finding に
`file:line` を要求する — エビデンスのないエントリは構造的に無効。

## Rationalization Counters

| 言い訳                       | カウンター                                                     |
| ---------------------------- | -------------------------------------------------------------- |
| 「これは false positive」    | evidence-verifier で検証してから棄却。直感 ≠ エビデンス        |
| 「このパターンは意図的」     | `// intentional:` マーカーなし = 意図的ではない                |
| 「重要度が低いからスキップ」 | 低重要度 × 高頻度 = 高リスク。件数を数える                     |
| 「コードは動いている」       | 動く ≠ 正しい。監査は品質を見る、機能ではない                  |
| 「サードパーティコード」     | 自リポジトリにあれば、自分の責任                               |

## 入力

- 対象スコープ: `$1`（任意）
- `$1` が空の場合 →
  AskUserQuestion でフォーカスを選択、ステージ済み/変更ファイルをレビュー
- `--runs=N`（任意、1-3、デフォルト 1）。N > 1 で multi-run 集約を起動し、
  stochastic な findings ドリフトに対抗する — 下記 Multi-run Policy 参照

### 監査フォーカス

| 質問       | 選択肢                                     |
| ---------- | ------------------------------------------ |
| フォーカス | security / performance / readability / all |

### Multi-run Policy

Reviewer findings は stochastic: 同一 reviewer・同一 target でも run 間で
約 50% の findings が入れ替わる（2026-04-20 diagnostic 実証）。高信頼カバレッジが
必要なときは `--runs=2` または `--runs=3` を指定。

| N   | ユースケース                           | コスト               |
| --- | -------------------------------------- | -------------------- |
| 1   | クイックチェック（デフォルト）         | baseline             |
| 2   | 標準監査、FN リスク許容                | reviewer run ~2 倍   |
| 3   | リリース前、FN リスク不許容           | reviewer run ~3 倍   |

N > 1 のとき Leader は Wave 1（reviewer fan-out）を N 回逐次実行し、
`(file:line, category, reviewer)` をキーに findings を重複排除集約する。
集約された finding は `runs_observed: [1, 3]`（どの run で検出されたか）を
持ち、透明性を担保する。

## 実行

Pre-flight（下記参照）を先に実行。結果表示前にスナップショットを保存。

| Step | アクション                                                                   |
| ---- | ---------------------------------------------------------------------------- |
| 1    | Pre-flight（テスト + hook findings）                                         |
| 2    | ファイルルーティング: 対象ファイルを分類 → 関連レビュアーに割当              |
| 3    | Task で Sub-reviewer を 1 ターン内の並列呼び出しで生成（最大 10 並列/バッチ） |
| 4    | Challenger + Verifier を生成（レビュアー完了待ち）                           |
| 5    | Integrator を生成（Challenger + Verifier 完了待ち）                          |
| 6    | Leader が Integrator から最終 Markdown を受信                                |
| 7    | スナップショット保存                                                         |
| 8    | 差分表示 + レポート                                                          |

#### ファイルルーティング

Leader が対象ファイルをパスで分類し、関連レビュアーのみに割当:

| ファイルパターン                | レビュアー (subagent_type)                                                                                                                                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `*.sh`                          | security-reviewer, silent-failure-reviewer, code-quality-reviewer, duplication-reviewer, reuse-reviewer, efficiency-reviewer, operational-readiness-reviewer, chaos-engineer                                                                                          |
| `*.ts, *.tsx, *.js`             | security-reviewer, silent-failure-reviewer, type-safety-reviewer, code-quality-reviewer, duplication-reviewer, reuse-reviewer, efficiency-reviewer, design-pattern-reviewer, testability-reviewer, performance-reviewer, operational-readiness-reviewer, chaos-engineer |
| `*.md`（エージェント定義）      | prompt-reviewer, document-reviewer                                                                                                                                                                                                                                    |
| `*.md`（コマンド/ドキュメント） | prompt-reviewer, document-reviewer                                                                                                                                                                                                                                    |
| `*.md`（rules）                 | prompt-reviewer, document-reviewer                                                                                                                                                                                                                                    |
| `*.yaml, *.json`                | type-design-reviewer, document-reviewer                                                                                                                                                                                                                               |
| `*.css, *.html`                 | accessibility-reviewer, progressive-enhancer, performance-reviewer, duplication-reviewer                                                                                                                                                                              |
| `test.*`, `*.test.*`            | test-coverage-reviewer, testability-reviewer                                                                                                                                                                                                                          |
| その他                          | code-quality-reviewer, duplication-reviewer, reuse-reviewer, efficiency-reviewer, document-reviewer                                                                                                                                                                   |

パスによる分類: `agents/**/*.md` → エージェント定義、`skills/*/SKILL.md` または
`docs/**/*.md` → スキル/ドキュメント、`rules/**/*.md` → rules、その他 `*.md`
→ スキル/ドキュメント（デフォルト）。

root-cause-reviewer はこのテーブルに含まれない — code-quality-reviewer 完了後に
順次実行（順序依存関係を参照）。Leader が同じファイルリスト + CQ findings を渡して
生成する。

#### Sub-reviewer 生成

各 Sub-reviewer は Task で直接生成:

- subagent_type: レビュアー名（例: `security-reviewer`）
- model: `sonnet`（override。opus だと watchdog timeout 多発）
- プロンプト: 割当ファイル一覧 + フォーカス + 発見事項スキーマ + reliability constraints
- team_name なし（スタンドアロン バックグラウンドエージェント）

Reliability constraints（全 reviewer prompt に必ず含める）:

- "Do NOT call the advisor tool. Work autonomously from your own analysis."
- "Complete within 8 minutes. If uncertain about a finding, include it with confidence < 0.85 rather than skip."

根拠: 2026-04-20 diagnostic (tally `HEAD~2..HEAD`) で opus + advisor 呼出 +
Rust 深堀の複合により 3/7 reviewer が 600s stream watchdog で stall。上記制約 +
sonnet override で 2 回連続 0/7 stall を実証。

Fan-out がこのステップの本質。適用可能なすべての Sub-reviewer を単一レスポンス内の
並列 Task 呼び出しで生成する — レビュアー 1 つにつき 1 つの Task 呼び出し。
逐次生成は並列性を損ない、ターンを浪費する。

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

スタンドアロン構成。Leader が Task 完了で結果収集、Task プロンプトで生成。

### エラーハンドリング

スキップされたレビュアーは必ず `pipeline_health.domains_skipped` にスキップ理由を記録すること。

| エラー               | リカバリ                                            | スキップ理由                   |
| -------------------- | --------------------------------------------------- | ------------------------------ |
| 監査対象ファイルなし | 「監査対象ファイルなし」を返却                      | —                              |
| Reviewer 停滞        | 120 秒タイムアウト；なしで続行                      | `timeout`                      |
| 不正 Markdown        | スキップ；有効なレビュアーで続行                    | `malformed_output`             |
| 依存先停滞           | 依存先スキップ（例: CQ 失敗 → root-cause 省略）     | `dependency_stall: {upstream}` |
| 並列数 >10           | 10 件ずつバッチ実行                                 | —                              |
| Challenger 停滞      | 120 秒タイムアウト；Verifier のみで続行             | —                              |
| Verifier 停滞        | 120 秒タイムアウト；Challenger のみで続行           | —                              |
| Integrator 停滞      | 120 秒タイムアウト；Leader が手動統合               | —                              |

## Pre-flight: テスト + Hook Findings

詳細手順は [`references/pre-flight.md`](references/pre-flight.md) を参照:
タスクランナー検出 → テストスクリプト探索 → テスト実行 → hook 出力を
`PF-{seq}` finding に変換。

## スナップショット

Session ID: ${CLAUDE_SESSION_ID}

```bash
SNAPSHOT="$HOME/.claude/workspace/history/audit-$(date -u +%Y-%m-%d-%H%M%S).yaml"
```

## テンプレート

| テンプレート                                                          | 目的                     |
| --------------------------------------------------------------------- | ------------------------ |
| [@../templates/audit/output.md](../templates/audit/output.md)         | 差分付き出力形式         |
| [@../templates/audit/snapshot.yaml](../templates/audit/snapshot.yaml) | スナップショットスキーマ |

## 検証

| チェック                      | 必須 |
| ----------------------------- | ---- |
| レビュアー完了？              | Yes  |
| Challenger 検証？             | Yes  |
| Verifier 検証？               | Yes  |
| Integrator が Markdown 作成？ | Yes  |
| スナップショット保存？        | Yes  |
| 差分表示？                    | Yes  |
