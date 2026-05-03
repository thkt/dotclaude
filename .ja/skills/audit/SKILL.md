---
name: audit
description: コード品質評価のため、専門 reviewer エージェント群をオーケストレーションする。クイック PR スクリーニングには使わない (/preview を使用)。
when_to_use: レビューして, コードレビュー, 品質チェック, code review, quality check, review
allowed-tools: Bash(git diff:*) Bash(git status:*) Bash(git log:*) Bash(git show:*) Bash(date:*) Bash(mkdir:*) Read Write LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[target files or scope]"
---

# /audit - Code Audit Orchestrator

専門 reviewer エージェントをオーケストレーションし、根拠ベースのフィルタリングを行う。Finding schema は全 finding に `file:line` を要求する。根拠のないエントリは構造的に無効。

## Rationalization Counters

| 言い訳                        | 反論                                                                 |
| ----------------------------- | -------------------------------------------------------------------- |
| "This is a false positive"    | 却下する前に critic-evidence で検証する。直感は根拠ではない          |
| "This pattern is intentional" | `// intentional:` マーカーがなければ intentional ではない            |
| "Low severity, skip it"       | low severity × high frequency = high risk. 出現回数を数える         |
| "The code works fine"         | 動くことは正しいことではない。Audit は機能ではなく品質をレビューする |
| "This is third-party code"    | リポジトリにあるならあなたの責任                                     |

## Input

- `$ARGUMENTS` は引数文字列全体。Leader は使う前にホワイトスペースで分割する。先頭 positional トークンが scope、残りの `--key=value` トークンがオプション。`$ARGUMENTS` をそのまま `git diff` に渡してはいけない。
- Scope: SHA/branch range (`x..y`) またはファイルパス → `git diff --name-only <scope>` → ファイル一覧
- scope が空 → AskUserQuestion で focus を選択し、staged/modified ファイルをレビュー
- scope が指定されていれば → focus はデフォルト `all` (AskUserQuestion なし)
- `--runs=N` (任意、1-3, デフォルト 1)。N > 1 は確率的な findings ドリフトに対抗する multi-run 集約を起動。下記 Multi-run Policy を参照
- `--focus=<value>` (任意)。scope 指定時のデフォルト `all` を上書き。`security` / `performance` / `quality` / `a11y` / `all` を受け付ける
- `--no-limit` (任意)。ファイル数制限チェックをスキップ (下記 File Count Policy)。CI 内 audit やブランチ全体レビューで意図が明示的なときに使う

### Audit Focus

| 質問  | 選択肢                                        |
| ----- | --------------------------------------------- |
| Focus | security / performance / quality / a11y / all |

#### Focus to Reviewer Mapping

File Routing がファイルパターンごとに reviewer を割り当てた後、Leader は結果を focus でフィルタする。focus セットに含まれる reviewer のみが実際に走る。`reviewer-causation` は Wave 1 セットに従う (Sequential Dependencies を参照)。`quality` または `all` で依存する上流 reviewer が含まれるときに走る。

| focus       | 含まれる reviewer                                                                                                                                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| security    | reviewer-security, reviewer-silence                                                                                                                                                                                                                                |
| performance | reviewer-performance, reviewer-efficiency, reviewer-progressive                                                                                                                                                                                                    |
| quality     | reviewer-readability, reviewer-design, reviewer-strictness, reviewer-encapsulation, reviewer-causation, reviewer-resilience, reviewer-duplication, reviewer-reuse, reviewer-testability, reviewer-operations, reviewer-document, reviewer-prompt, reviewer-silence |
| a11y        | reviewer-accessibility, reviewer-progressive                                                                                                                                                                                                                       |
| all         | フィルタなし。File Routing の全 reviewer が走る                                                                                                                                                                                                                    |

フィルタルール。ファイルあたりの最終 reviewer セット = (File Routing でそのパターンに割り当てられた reviewer) ∩ (Focus reviewer)。あるファイルで交差が空のとき、その focus ではそのファイルをスキップする。

### Multi-run Policy

reviewer の findings は同じ対象でも実行ごとにドリフトする。十分に裏付けられたカバレッジが重要なときは `--runs=2` または `--runs=3` を渡す。

| N   | ユースケース                  | コスト            |
| --- | ----------------------------- | ----------------- |
| 1   | クイックチェック (デフォルト) | baseline          |
| 2   | 標準 audit、FN リスク許容可能 | reviewer 実行 ~2x |
| 3   | リリース前、FN リスク許容不可 | reviewer 実行 ~3x |

N > 1 のとき、Leader は Wave 1 (reviewer fan-out) を順次 N 回実行し、下記手順で findings を集約する。

#### 集約

1. merge 前に各 finding を正規化:
   - `file`: プロジェクトルートからのリポジトリ相対パス (例: `src/config.rs`、`config.rs` ではない)
   - `line`: `M` または `M-N` → `(start, end)` タプル
   - `category`: 小文字、`/` の前のプレフィックスを取る (例: `structure/waste` → `structure`)
2. Merge キー: `(file, category, reviewer)` で line-range overlap tolerance ±3
3. `runs_observed`: 当該 finding を生成した実行 index の整数配列 (1-based); merge 時に union
4. メッセージ分岐時: 最長を保持。検証が必要なら `messages: [...]` で両方保持

正規化なしの厳格キーマッチでは、reviewer がパス形式・行境界・category ラベルを実行ごとに変えるため、ほとんどの findings が unmerged のまま残る。三方向すべてに tolerance が必要。

±3 行 tolerance は経験則で選択: 厳格キーは 2-run 診断で merge 率約 3%、上記正規化付き ±3 で約 33% (10倍向上)。タイト (±1) では同一 issue の正当な findings が under-merge になる。広い (±5+) は近接行の別 issue を false merge するリスクがある。観測された false merge が増えたら ±1 にタイトに、または range overlap のみを要求する。

### File Count Policy

Audit コストはターゲットファイル数とともに増える。Leader は soft limit を適用し、reviewer ごとのファイル一覧をバッチ分割する。

| Mode                   | アクション                                                        |
| ---------------------- | ----------------------------------------------------------------- |
| scope 空、files ≤ 30  | 続行                                                              |
| scope 空、files > 30   | AskUserQuestion で 3 つの選択肢。下記 Narrow Scope Options を参照 |
| scope 指定、files > 30 | ファイル数を警告して続行 (意図を尊重)                             |
| `--no-limit` 設定      | limit チェックをスキップ、続行                                    |

#### Narrow Scope Options

ユーザーが AskUserQuestion で "Narrow scope" を選んだとき、以下を提示。

| 選択肢         | 解決後の scope |
| -------------- | -------------- |
| Last commit    | `HEAD~1..HEAD` |
| Last 5 commits | `HEAD~5..HEAD` |
| Cancel         | Audit を中断   |

#### Spawn Batching

reviewer に割り当てられたファイル一覧が 10 ファイルを超えるとき、Leader は 10 件ずつのバッチに分割し、その reviewer に対し 1 バッチ 1 Task call を発行する。integrator は `(file, category, reviewer)` (Multi-run Aggregation と同一キー) でバッチ越しの findings を集約する。

## Execution

Pre-flight (下記) から開始。ユーザーに結果を表示する前に snapshot を保存する。

| Step | アクション                                                                             |
| ---- | -------------------------------------------------------------------------------------- |
| 1    | Pre-flight (tests + hook findings)                                                     |
| 2    | File routing: ターゲットファイルを分類 → 該当 reviewer に割り当て                     |
| 3    | Task で sub-reviewer を 1 turn 内で並列 spawn (バッチあたり最大 10)                    |
| 4    | challenger + verifier を spawn (reviewer 完了を待つ)                                   |
| 5    | integrator を spawn (challenger + verifier 完了を待つ)                                 |
| 6    | Integrator が snapshot data を生成。Leader が session/branch/pre_flight/delta を補完   |
| 7    | snapshot を history に保存                                                             |
| 8    | ${CLAUDE_SKILL_DIR}/templates/output.md で snapshot から Markdown を render し表示する |

#### File Routing

Leader は各ターゲットファイルをパスで分類し、該当 reviewer にのみ割り当てる。

| File パターン        | Sub-reviewer (subagent_type)                                                                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `*.sh`               | reviewer-security, reviewer-silence, reviewer-duplication, reviewer-reuse, reviewer-efficiency, reviewer-operations, reviewer-resilience                                                                                                                                 |
| `*.ts, *.js`         | reviewer-security, reviewer-silence, reviewer-strictness, reviewer-duplication, reviewer-reuse, reviewer-efficiency, reviewer-design, reviewer-testability, reviewer-performance, reviewer-operations, reviewer-resilience                                               |
| `*.tsx, *.jsx`       | reviewer-security, reviewer-silence, reviewer-strictness, reviewer-duplication, reviewer-reuse, reviewer-efficiency, reviewer-design, reviewer-testability, reviewer-performance, reviewer-operations, reviewer-resilience, reviewer-accessibility, reviewer-progressive |
| `*.rs, *.py`         | reviewer-security, reviewer-silence, reviewer-strictness, reviewer-duplication, reviewer-reuse, reviewer-efficiency, reviewer-design, reviewer-testability, reviewer-performance, reviewer-operations, reviewer-resilience                                               |
| `*.md`               | reviewer-prompt, reviewer-document                                                                                                                                                                                                                                       |
| `*.yaml, *.json`     | reviewer-encapsulation, reviewer-document                                                                                                                                                                                                                                |
| `*.css, *.html`      | reviewer-accessibility, reviewer-progressive, reviewer-performance, reviewer-duplication                                                                                                                                                                                 |
| `test.*`, `*.test.*` | reviewer-coverage, reviewer-testability                                                                                                                                                                                                                                  |
| その他               | reviewer-duplication, reviewer-reuse, reviewer-efficiency, reviewer-document                                                                                                                                                                                             |

reviewer-causation は表に含まない。Wave 1 reviewer がすべて完了した後、逐次実行する (下記 Sequential Dependencies)。Leader は同じファイル一覧 + Wave 1 全 findings を入力に spawn する。

#### Sub-reviewer Spawn

各 sub-reviewer は Task で直接 spawn する。

- subagent_type: reviewer 名 (例: `reviewer-security`)
- model: `sonnet` (上書き; 診断で確認した opus watchdog タイムアウトを回避)
- Prompt: 割り当てファイル一覧 + focus + finding schema + 信頼性制約
- team_name なし (スタンドアロン background エージェント)

信頼性制約 (全 reviewer prompt にそのまま含める)。

- "Do NOT call the advisor tool. Work autonomously from your own analysis."
- "Complete within 8 minutes. If uncertain about a finding, include it rather than skip. The challenger will prune false positives."

理由: opus + advisor + 深い分析は stream watchdog を超過する。Sonnet 上書き + advisor 禁止制約で reviewer の停滞を排除する。

このステップの目的は fan-out。該当 sub-reviewer をすべて 1 つのレスポンス内で並列 Task call として spawn する。reviewer 1 件につき 1 Task call。逐次 spawn は並列性を打ち消し、turn を浪費する。

#### Pipeline Roles

| Role       | subagent_type    | 目的                                |
| ---------- | ---------------- | ----------------------------------- |
| challenger | critic-audit     | findings を challenge (FP 削減)     |
| verifier   | critic-evidence  | findings を検証 (positive evidence) |
| integrator | team-integration | root cause に統合                   |

#### Sequential Dependencies

| Reviewer   | 依存                       | 理由                                                                 |
| ---------- | -------------------------- | -------------------------------------------------------------------- |
| root-cause | Wave 1 reviewer + PF       | 5 Whys のために全 finding (Wave 1 + 静的) が必要                     |
| challenger | Wave 1 reviewer のみ       | PF はスキップ (deterministic ツールで機械的に確認済み)               |
| verifier   | Wave 1 reviewer のみ       | PF はスキップ (ツール出力自体が evidence)                            |
| integrator | challenger + verifier + PF | reconcile した Wave 1 と PF を統合; Wave 1 の cross-reference を追加 |

#### Handoff (Standalone)

エージェントはスタンドアロン。Leader は Task 完了で取得し、Task prompt で spawn する。

### Error Handling

スキップした reviewer は理由とともに `pipeline_health.domains_skipped` に記録する。

| エラー              | リカバリ                                                                     | スキップ理由                   |
| ------------------- | ---------------------------------------------------------------------------- | ------------------------------ |
| ファイルなし        | "No files to audit" を返す                                                   | -                              |
| Reviewer 停滞       | 120s タイムアウト; なしで続行                                                | `timeout`                      |
| 不正出力            | reviewer をスキップ; 有効 reviewer で続行                                    | `malformed_output`             |
| 依存停滞            | 依存先をスキップ (例: Wave 1 が失敗したら root-cause)                        | `dependency_stall: {upstream}` |
| 最大並列 >10        | 10 件単位でバッチ分割                                                        | -                              |
| Pipeline-agent 停滞 | 120s タイムアウト; 残りエージェントで続行; integrator 失敗時は Leader が統合 | -                              |

## Pre-flight: Tests + Hook Findings

完全な手順は ${CLAUDE_SKILL_DIR}/references/pre-flight.md を読む。task runner 検出 → test スクリプト検索 → tests 実行 → hook 出力を `PF-{seq}` finding に変換。

## Snapshot

Session ID: ${CLAUDE_SESSION_ID}

```bash
SNAPSHOT="$HOME/.claude/workspace/history/audit-$(date -u +%Y-%m-%d-%H%M%S).json"
```

## Templates

| Template                                          | 目的                         |
| ------------------------------------------------- | ---------------------------- |
| ${CLAUDE_SKILL_DIR}/templates/output.md           | delta 込みの出力フォーマット |
| ${CLAUDE_SKILL_DIR}/templates/snapshot.json       | Snapshot 例                  |
| ${CLAUDE_SKILL_DIR}/references/snapshot-schema.md | Snapshot schema              |
