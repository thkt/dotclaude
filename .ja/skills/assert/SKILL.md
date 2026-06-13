---
name: assert
description: Codex + audit reviewer による独立アウトカムベース検証。静的 + 動的根拠を統合し Ready / Ready (caveat) / NotReady の三値ゲートを判定する。クイックなコードレビューには使わない (/polish を使用)。静的のみの監査にも使わない (/audit を使用)。
when_to_use: 検証して, assert, 独立検証, outcome assertion, gate decision, adversarial testing
allowed-tools: Bash(codex:*) Bash(git worktree:*) Bash(git diff:*) Bash(git status:*) Bash(git log:*) Bash(git branch:*) Bash(git ls-files:*) Bash(npm ci:*) Bash(npm run:*) Bash(npm test:*) Bash(cargo:*) Bash(make:*) Bash(bun:*) Bash(pnpm:*) Bash(yarn:*) Bash(which:*) Bash(date:*) Read Write LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*) Bash($HOME/.claude/skills/assert/scripts/*)
model: opus
argument-hint: "[file paths or directory for target mode] [--base <branch>]"
---

# /assert - 独立アウトカムベース assertion

Codex は隔離された worktree 上で独立して検証を行い、Claude Code が全体のオーケストレーションと統合を担う。統合した静的 / 動的の両根拠をもとに、三値ゲート（Ready / Ready (caveat) / NotReady）を判定する。

## 入力と Mode

Base ブランチは、指定があれば `--base <branch>` を、なければ `main` を使う。スコープは `$ARGUMENTS` に応じて下表のとおり判定する。

| `$ARGUMENTS`                         | Mode   | スコープ                                                             |
| ------------------------------------ | ------ | -------------------------------------------------------------------- |
| ファイルパス                         | target | git tracking 状態を問わない単一ファイル                              |
| ディレクトリ                         | target | `git ls-files <path>` の出力 (再帰、`.gitignore` 尊重、tracked のみ) |
| なし / 未コミット変更あり            | diff   | 未コミットの変更ファイル                                             |
| なし / base ブランチより先行コミット | diff   | 変更ファイル (branch diff)                                           |
| なし / 変更なし                      | -      | 中断                                                                 |

## Pre-flight

アウトカムベースの検証には、検証の対象となるアウトカムそのものが必要になる。Phase 0 に入る前に `.claude/OUTCOME.md` を読み、そのリポジトリにとっての「完了」を確定させる。

| 条件                               | 動作                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `.claude/OUTCOME.md` あり          | Behavior / Non-goals / Constraints の各セクションを読んでキャッシュ    |
| `.claude/OUTCOME.md` なし          | `/outcome` でファイルを生成してから続行                                |
| Behavior が空 / 全セクションが TBD | 不在として扱い `/outcome` を実行                                       |
| assert 対象が Non-goal に触れる    | Intent Assertion finding として report に記載。block は Phase 4 が判定 |
| assert 対象が Constraint を破る    | `[adversarial]` finding として promote (Issues > 0 ルートで NotReady)  |

## フェーズ

モード列が `parallel (required)` のフェーズでは、Task / Bash / Codex exec の呼び出しをすべて 1 レスポンス内で同時に発行する。逐次的に呼び出すと fan-out の効果が打ち消され、wall time が倍になる。

| Phase | アクション          | 実行者                     | モード              | 依存    | 詳細                                                       |
| ----- | ------------------- | -------------------------- | ------------------- | ------- | ---------------------------------------------------------- |
| pre   | OUTCOME.md 読込     | orchestrator (Read)        | sequential          | -       | 上記 Pre-flight セクション                                 |
| 0     | Bootstrap worktree  | orchestrator (Bash)        | sequential          | pre     | ${CLAUDE_SKILL_DIR}/references/phase-0.md                  |
| 1     | Evidence collection | Codex CLI + audit agents   | parallel (required) | Phase 0 | ${CLAUDE_SKILL_DIR}/references/phase-1.md                  |
| 2     | Deep assertion      | Codex CLI + audit agents   | parallel (required) | Phase 1 | ${CLAUDE_SKILL_DIR}/references/phase-2.md                  |
| 3     | Intent assertion    | orchestrator (Claude Code) | sequential          | Phase 2 | ${CLAUDE_SKILL_DIR}/references/phase-3.md                  |
| 4     | Evidence synthesis  | enhancer-evidence          | single task         | Phase 3 | ${CLAUDE_SKILL_DIR}/references/phase-4.md                  |
| final | Worktree cleanup    | orchestrator (Bash)        | sequential          | Always  | ${CLAUDE_SKILL_DIR}/references/phase-0.md § クリーンアップ |

## レポート

leader は gate を生成せず、enhancer-evidence が返す JSON decision ブロックを decode して report として中継する。テンプレートは `${CLAUDE_SKILL_DIR}/templates/report.md`、ゲート関連ルールは `${CLAUDE_SKILL_DIR}/references/phase-4.md` に集約されている。

| 知りたいこと                                 | phase-4.md セクション |
| -------------------------------------------- | --------------------- |
| Ready / Ready (caveat) / NotReady の判定条件 | § Gate ルール         |
| JSON decision ブロックの decode 手順         | § Gate Decode         |
| Bootstrap 失敗時の gate 分岐                 | § Bootstrap 失敗処理  |
| 完了メッセージに `gate = Ready` を書く条件   | § /goal 統合          |

## エラー処理

| エラー                           | リカバリ                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| codex 未インストール             | インストール手順を表示して中断                                                                 |
| Bootstrap fail / env             | Phase 1c + 2a をスキップし、静的のみで続行。gate 分岐は phase-4.md § Bootstrap 失敗処理 を参照 |
| Bootstrap fail / build smoke     | Phase 1c + 2a をスキップ。gate 分岐は phase-4.md § Bootstrap 失敗処理 を参照                   |
| Bootstrap timeout (780s overall) | build 開始済みなら build smoke fail、それ以外は env fail として扱う                            |
| Codex review fails               | エラーをログ。audit reviewer のみで続行                                                        |
| Codex exec timeout (600s)        | その phase をスキップ、レポートに記録                                                          |
| Reviewer stall (120s)            | 当該 reviewer なしで続行、警告を記録                                                           |
| Challenger stall                 | verifier のみで続行                                                                            |
| Verifier stall                   | challenger のみで続行                                                                          |
| Integrator stall                 | Leader が手動で統合 (簡易レポート)                                                             |
| Worktree cleanup fails           | 警告を記録、手動 cleanup を提案                                                                |

## エスカレーション

| 条件                                                 | アクション                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| 何らかの issue (challenger / verifier / adversarial) | merge をブロック、`/fix` を提案                                 |
| アーキテクチャ的な root cause を発見                 | `/think` で設計レビューを提案                                   |
| Adversarial test がカバレッジギャップを発見          | `/code` でテスト追加を提案                                      |
| `gate = Ready (caveat)`                              | 環境を復旧して `/assert` を再実行、または動的根拠ギャップを受容 |

## 完了条件

以下をすべて満たしたときのみ終了する。満たせない項目は理由をレポートに記録する。

| 項目      | 条件                                              |
| --------- | ------------------------------------------------- |
| Mode      | target / diff を検出した                          |
| Bootstrap | 実行を試行した (成否は gate に反映)               |
| Phase 1   | 静的 + 動的根拠を収集した                         |
| Phase 2   | challenger / verifier を実行した                  |
| Phase 4   | enhancer-evidence の JSON decision を decode した |
| Gate      | 三値ゲートを表示した                              |
| Worktree  | クリーンアップした (失敗時は手動手順を提示)       |
