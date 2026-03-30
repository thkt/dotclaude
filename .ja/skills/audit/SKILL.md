---
name: audit
description:
  包括的なコード品質評価のために専門レビューエージェントをオーケストレート。ユーザーがレビューして,
  コードレビュー, 品質チェック, code
  review等に言及した場合に使用。PRの軽量スクリーニングには /preview を使用。
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*),
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

## 実行

Pre-flight（下記参照）を先に実行。結果表示前にスナップショットを保存。

| Step | アクション                                                      |
| ---- | --------------------------------------------------------------- |
| 1    | Pre-flight（テスト + hook findings）                            |
| 2    | ファイルルーティング: 対象ファイルを分類 → 関連レビュアーに割当 |
| 3    | Task（バックグラウンド、最大 10 並列）で Sub-reviewer を生成    |
| 4    | Challenger + Verifier を生成（レビュアー完了待ち）              |
| 5    | Integrator を生成（Challenger + Verifier 完了待ち）             |
| 6    | Leader が Integrator から最終 YAML を受信                       |
| 7    | スナップショット保存                                            |
| 8    | 差分表示 + レポート                                             |

#### ファイルルーティング

Leaderが対象ファイルをパスで分類し、関連レビュアーのみに割当:

| ファイルパターン                | レビュアー                                           |
| ------------------------------- | ---------------------------------------------------- |
| `*.sh`                          | security, silent-failure, code-quality,              |
|                                 | duplication, reuse, efficiency,                      |
|                                 | operational-readiness                                |
| `*.ts, *.tsx, *.js`             | security, silent-failure, type-safety, code-quality, |
|                                 | duplication, reuse, efficiency, design-pattern,      |
|                                 | testability, performance, operational-readiness      |
| `*.md`（エージェント定義）      | prompt, document                                     |
| `*.md`（コマンド/ドキュメント） | prompt, document                                     |
| `*.yaml, *.json`                | type-design, document                                |
| `*.css, *.html`                 | accessibility, progressive-enhancer, performance,    |
|                                 | duplication                                          |
| `test.*`, `*.test.*`            | test-coverage, testability                           |
| その他                          | code-quality, duplication, reuse,                    |
|                                 | efficiency, document                                 |

パスによる分類: `agents/**/*.md` → エージェント定義、`skills/*/SKILL.md` または
`docs/**/*.md` → スキル/ドキュメント、その他 `*.md`
→ スキル/ドキュメント（デフォルト）。

root-cause-reviewerはこのテーブルに含まれない — code-quality-reviewer完了後に
順次実行（順序依存関係を参照）。Leaderが同じファイルリスト + CQ findingsを渡して
生成する。

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

## Pre-flight: テスト + Hook Findings

詳細手順は [`references/pre-flight.md`](references/pre-flight.md) を参照:
タスクランナー検出 → テストスクリプト探索 → テスト実行 → hook出力を
`PF-{seq}` findingに変換。

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

| チェック                  | 必須 |
| ------------------------- | ---- |
| レビュアー完了？          | Yes  |
| Challenger 検証？         | Yes  |
| Verifier 検証？           | Yes  |
| Integrator が YAML 作成？ | Yes  |
| スナップショット保存？    | Yes  |
| 差分表示？                | Yes  |
