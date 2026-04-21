---
name: audit
description: "包括的なコード品質評価のために専門レビューエージェントをオーケストレート。Use when: レビューして, コードレビュー, 品質チェック, code review, quality check. Do NOT use for quick PR screening (use /preview instead)."
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task, AskUserQuestion
model: opus
argument-hint: "[対象ファイルまたはスコープ]"
user-invocable: true
---

# /audit - コード監査オーケストレーター

エビデンスベースフィルタリングで専門レビューエージェントをオーケストレート。発見事項スキーマは全 finding に `file:line` を要求する — エビデンスのないエントリは構造的に無効。

## Rationalization Counters

| 言い訳                       | カウンター                                                     |
| ---------------------------- | -------------------------------------------------------------- |
| 「これは false positive」    | evidence-verifier で検証してから棄却。直感 ≠ エビデンス        |
| 「このパターンは意図的」     | `// intentional:` マーカーなし = 意図的ではない                |
| 「重要度が低いからスキップ」 | 低重要度 × 高頻度 = 高リスク。件数を数える                     |
| 「コードは動いている」       | 動く ≠ 正しい。監査は品質を見る、機能ではない                  |
| 「サードパーティコード」     | 自リポジトリにあれば、自分の責任                               |

## 入力

- `$1` は引数文字列全体を保持する。Leader は使用前に空白で split すること — 最初の positional token が scope、残りの `--key=value` が options。`$1` を `git diff` に literal で渡してはならない。
- スコープ: SHA/branch range（`x..y`）または file path → `git diff --name-only <scope>` → file list
- スコープが空 → AskUserQuestion でフォーカスを選択、ステージ済み/変更ファイルをレビュー
- `--runs=N`（任意、1-3、デフォルト 1）。N > 1 で multi-run 集約を起動し、stochastic な findings ドリフトに対抗する — 下記 Multi-run Policy 参照

### 監査フォーカス

| 質問       | 選択肢                                     |
| ---------- | ------------------------------------------ |
| フォーカス | security / performance / readability / all |

### Multi-run Policy

Reviewer findings は同一 target でも run 間で drift する。裏付けの強いカバレッジが必要なときは `--runs=2` または `--runs=3` を指定。

| N   | ユースケース                           | コスト               |
| --- | -------------------------------------- | -------------------- |
| 1   | クイックチェック（デフォルト）         | baseline             |
| 2   | 標準監査、FN リスク許容                | reviewer run ~2 倍   |
| 3   | リリース前、FN リスク不許容           | reviewer run ~3 倍   |

N > 1 のとき Leader は Wave 1（reviewer fan-out）を N 回逐次実行し、下記手順で findings を集約する。

#### Aggregation

1. merge 前に各 finding を normalize:
   - `file`: project root からの repo-relative path（例: `src/config.rs`、`config.rs` 不可）
   - `line`: `M` または `M-N` → `(start, end)` tuple
   - `category`: 小文字化、`/` の前の prefix を取る（例: `structure/waste` → `structure`）
2. Merge key: `(file, category, reviewer)` + line range overlap ±3 tolerance
3. `runs_observed`: finding を生成した run index（1-based）の integer array、merge 時に union
4. message divergence 時: 最長を採用、検証が必要なら `messages: [...]` に両方保存

normalization なしの厳密 key match では reviewer が run 間で path format・line 境界・category ラベルを変えるため、ほとんどの findings が merge されない。3 軸すべてに tolerance が必須。

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
| `*.sh`                          | security-reviewer, silent-failure-reviewer, duplication-reviewer, reuse-reviewer, efficiency-reviewer, operational-readiness-reviewer, chaos-engineer                                                                                          |
| `*.ts, *.tsx, *.js`             | security-reviewer, silent-failure-reviewer, type-safety-reviewer, duplication-reviewer, reuse-reviewer, efficiency-reviewer, design-pattern-reviewer, testability-reviewer, performance-reviewer, operational-readiness-reviewer, chaos-engineer |
| `*.md`                          | prompt-reviewer, document-reviewer                                                                                                                                                                                                                                    |
| `*.yaml, *.json`                | type-design-reviewer, document-reviewer                                                                                                                                                                                                                               |
| `*.css, *.html`                 | accessibility-reviewer, progressive-enhancer, performance-reviewer, duplication-reviewer                                                                                                                                                                              |
| `test.*`, `*.test.*`            | test-coverage-reviewer, testability-reviewer                                                                                                                                                                                                                          |
| その他                          | duplication-reviewer, reuse-reviewer, efficiency-reviewer, document-reviewer                                                                                                                                                                                          |

root-cause-reviewer はこのテーブルに含まれない — Wave 1 全レビュアー完了後に順次実行（順序依存関係を参照）。Leader が同じファイルリスト + Wave 1 全 findings を渡して生成する。

#### Sub-reviewer 生成

各 Sub-reviewer は Task で直接生成:

- subagent_type: レビュアー名（例: `security-reviewer`）
- model: `sonnet`（override。opus だと watchdog timeout 多発）
- プロンプト: 割当ファイル一覧 + フォーカス + 発見事項スキーマ + reliability constraints
- team_name なし（スタンドアロン バックグラウンドエージェント）

Reliability constraints（全 reviewer prompt に必ず含める）:

- "Do NOT call the advisor tool. Work autonomously from your own analysis."
- "Complete within 8 minutes. If uncertain about a finding, include it rather than skip — the challenger will prune false positives."

根拠: opus + advisor 呼出 + 深堀の複合は stream watchdog を超える。Sonnet override + advisor 禁止制約で reviewer stall を解消。

Fan-out がこのステップの本質。適用可能なすべての Sub-reviewer を単一レスポンス内の並列 Task 呼び出しで生成する — レビュアー 1 つにつき 1 つの Task 呼び出し。逐次生成は並列性を損ない、ターンを浪費する。

#### パイプラインロール

| ロール     | subagent_type          | 目的                             |
| ---------- | ---------------------- | -------------------------------- |
| challenger | devils-advocate-audit  | 発見事項に異議（FP 削減）        |
| verifier   | evidence-verifier      | 発見事項を検証（正のエビデンス） |
| integrator | progressive-integrator | 根本原因への統合                 |

#### 順序依存関係

| レビュアー | 依存先                | 理由                    |
| ---------- | --------------------- | ----------------------- |
| root-cause | Wave 1 レビュアー     | Wave 1 全発見事項が 5 Whys 入力に必要 |
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
| 依存先停滞           | 依存先スキップ（例: Wave 1 失敗 → root-cause 省略） | `dependency_stall: {upstream}` |
| 並列数 >10           | 10 件ずつバッチ実行                                 | —                              |
| パイプラインエージェント停滞 | 120 秒タイムアウト；残りのエージェントで続行、integrator 失敗時は Leader が統合 | — |

## Pre-flight: テスト + Hook Findings

詳細手順は [`references/pre-flight.md`](references/pre-flight.md) を参照: タスクランナー検出 → テストスクリプト探索 → テスト実行 → hook 出力を `PF-{seq}` finding に変換。

## スナップショット

Session ID: ${CLAUDE_SESSION_ID}

```bash
SNAPSHOT="$HOME/.claude/workspace/history/audit-$(date -u +%Y-%m-%d-%H%M%S).yaml"
```

## テンプレート

| テンプレート                                                          | 目的                     |
| --------------------------------------------------------------------- | ------------------------ |
| [@templates/output.md](templates/output.md)         | 差分付き出力形式         |
| [@templates/snapshot.yaml](templates/snapshot.yaml) | スナップショットスキーマ |

