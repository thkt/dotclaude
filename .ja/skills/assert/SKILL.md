---
name: assert
description: Codex + audit reviewer による独立アウトカムベース assertion。静的 + 動的根拠を統合し Ready / Ready (caveat) / NotReady の三値ゲートを発する。クイックなコードレビューには使わない (/polish を使用)。静的のみの監査にも使わない (/audit を使用)。
when_to_use: 検証して, assert, 独立検証, outcome assertion, gate decision, adversarial testing
allowed-tools: Bash(codex:*) Bash(git worktree:*) Bash(git diff:*) Bash(git status:*) Bash(git log:*) Bash(git branch:*) Bash(git ls-files:*) Bash(npm ci:*) Bash(npm run:*) Bash(npm test:*) Bash(cargo:*) Bash(make:*) Bash(bun:*) Bash(pnpm:*) Bash(yarn:*) Bash(which:*) Bash(date:*) Bash(rm:*) Read Write Grep Glob LS Task AskUserQuestion
model: opus
argument-hint: "[file paths or directory for target mode] [--base <branch>]"
---

# /assert - Independent Outcome-Based Assertion

Codex は隔離された worktree で独立に assert を行う。Claude Code がオーケストレーションと統合を担う。統合された静的 + 動的根拠から三値ゲート (Ready / Ready (caveat) / NotReady) を発する。スコア値は出さない。

## Rationalization Counters

| 言い訳                               | 反論                                                                |
| ------------------------------------ | ------------------------------------------------------------------- |
| "Tests pass, so the code is correct" | あなたのテスト、あなたの環境。独立 assertion がそのギャップを埋める |
| "Codex will just find the same bugs" | 異なるモデル = 異なる盲点。それこそが価値                           |
| "Adversarial testing takes too long" | 時間かかるならスキップ。ゲートは静的のみモードに fallback する      |
| "The code review already covered it" | レビューはコードを読む。assertion はコードを動かす。根拠が違う      |

## Input

| 引数              | 値                             | 結果                         |
| ----------------- | ------------------------------ | ---------------------------- |
| `$ARGUMENTS`      | ファイルパスまたはディレクトリ | `target` mode                |
| `$ARGUMENTS`      | 省略 (変更が存在)              | `diff` mode (自動検出)       |
| `--base <branch>` | base ブランチを上書き          | デフォルトの `main` を上書き |

## Mode Selection

| 条件                                             | Mode   | スコープ                                                             |
| ------------------------------------------------ | ------ | -------------------------------------------------------------------- |
| `$ARGUMENTS` がファイルパス                      | target | 単一ファイル (git tracking 状態を問わない)                           |
| `$ARGUMENTS` がディレクトリ                      | target | `git ls-files <path>` の出力 (再帰、`.gitignore` 尊重、tracked のみ) |
| `$ARGUMENTS` なし、未コミット変更あり            | diff   | 変更ファイル (未コミット)                                            |
| `$ARGUMENTS` なし、base ブランチより先行コミット | diff   | 変更ファイル (branch diff)                                           |
| `$ARGUMENTS` なし、変更なし                      | -      | 中断: "Nothing to assert"                                            |

Base ブランチ検出: `main` (デフォルト)、`--base <branch>` で上書き。ディレクトリスコープは `git ls-files` を使い `.gitignore` 解析を git に委譲する。ディレクトリ内の untracked ファイルは設計上除外する (未コミット作業を assert したい場合は diff mode を使う)。

## Execution

| Phase | アクション          | 実行者                     | モード              | 依存    | 詳細                                                       |
| ----- | ------------------- | -------------------------- | ------------------- | ------- | ---------------------------------------------------------- |
| 0     | Bootstrap worktree  | orchestrator (Bash)        | sequential          | -       | ${CLAUDE_SKILL_DIR}/references/bootstrap.md                |
| 1     | Evidence collection | Codex CLI + audit agents   | parallel (required) | Phase 0 | ${CLAUDE_SKILL_DIR}/references/phase-details.md § Phase 1 |
| 2     | Deep assertion      | Codex CLI + audit agents   | parallel (required) | Phase 1 | ${CLAUDE_SKILL_DIR}/references/phase-details.md § Phase 2 |
| 3     | Intent assertion    | orchestrator (Claude Code) | sequential          | Phase 2 | ${CLAUDE_SKILL_DIR}/references/phase-details.md § Phase 3 |
| 4     | Evidence synthesis  | enhancer-evidence          | single task         | Phase 3 | ${CLAUDE_SKILL_DIR}/references/phase-details.md § Phase 4 |
| final | Worktree cleanup    | orchestrator (Bash)        | sequential          | Always  | ${CLAUDE_SKILL_DIR}/references/phase-details.md § Cleanup |

Phase 0 制約: 全体で 300s タイムアウト。Bootstrap には fast-fail ガードとして build smoke test を含む。

- Step 1-3 fail (env: worktree, install): Phase 1c, 2a をスキップ → gate = Issues=0 なら Ready (caveat)、Issues>0 なら NotReady
- Step 4 fail (build smoke broken): Phase 1c, 2a をスキップ → gate = NotReady (Build = fail は Issues に関わらずブロック)

両パスとも失敗理由をレポートに記録する。

並列モードルール: `parallel (required)` と記された phase は、すべての Task / Bash / Codex exec 呼び出しを 1 つのレスポンス内で同時発行する。逐次呼び出しは fan-out を打ち消し、wall time を倍にする。

外部依存: Phase 1b の reviewer ファイルルーティングは /audit skill の File Routing 表に従う。そこを変えると /assert の reviewer 割り当てに影響する。

## Report

ゲートルールの canonical は ${CLAUDE_SKILL_DIR}/references/gate-decision.md。

```markdown
## Assertion Report

| Field     | Value                                     |
| --------- | ----------------------------------------- |
| gate      | Ready / Ready (caveat) / NotReady         |
| mode      | diff (main) / diff (uncommitted) / target |
| scope     | {file count} files                        |
| bootstrap | success / failed: {reason}                |

### Gate Decision

| Check       | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Build       | pass / fail / skipped                                                |
| Tests       | pass / fail (N passed, M failed) / skipped / no-runner               |
| Issues      | 0 / N total (X from challenger, Y from verifier, Z from adversarial) |
| Adversarial | N/M passed / skipped                                                 |

`Ready (caveat)` 行は bootstrap が失敗し Issues = 0 のとき表示される。`caveat: dynamic evidence skipped` を末尾に付記する。

### Blockers

[全 issue + build/test 失敗を Fix 提案とソースタグ (challenger / verifier / adversarial) 付きで]

空のとき: gate = Ready なら `(none)`。

### Root Causes

[RC-001... 説明、カテゴリ、findings、action 付き]

### Issues

[High / Medium severity 表。Source タグ、File:Line, Description, Evidence。複数ソース検出はすべてのタグを表示。例: `[challenger, adversarial]`]

### Adversarial Test Results

[テスト名、対象、結果、判定をテストごとに]

### Outcome Evidence

[build/test pass/fail、stderr 抜粋付き]

### Diff from previous

[Resolved / New / Carried from workspace/history/.]

`<promise>PASS</promise>` は gate = Ready のときのみ enhancer-evidence が発する (Ready (caveat) や NotReady では発しない)。Leader はそのまま中継し、再生成しない。
```

## Error Handling

| エラー                                 | リカバリ                                                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| codex 未インストール                   | インストール手順を表示して中断                                                                                             |
| Bootstrap fail at Step 1-3 (env)       | Phase 1c + 2a をスキップ → 静的のみモード。Build = `skipped`. gate = issues=0 なら Ready (caveat)、issues>0 なら NotReady |
| Bootstrap fail at Step 4 (build smoke) | Build = `fail` (skipped ではない)。Phase 1c + 2a をスキップ。gate = NotReady (build fail は issues 数に関わらずブロック)   |
| Bootstrap timeout (300s overall)       | Step 4 が開始されていれば Step 4 fail として扱う。それ以外は Step 1-3 fail として扱う                                      |
| Codex review fails                     | エラーをログ。audit reviewer のみで続行                                                                                    |
| Codex exec timeout (600s)              | その phase をスキップ、レポートに記録                                                                                      |
| Reviewer stall (120s)                  | 当該 reviewer なしで続行、警告を記録                                                                                       |
| Challenger stall                       | verifier のみで続行                                                                                                        |
| Verifier stall                         | challenger のみで続行                                                                                                      |
| Integrator stall                       | Leader が手動で統合 (簡易レポート)                                                                                         |
| 全ソースで issue ゼロ                  | gate = Ready (bootstrap 失敗時は Ready (caveat))。"no issues found" を記録                                                 |
| Worktree cleanup fails                 | 警告を記録、手動 cleanup を提案                                                                                            |

## Escalation

| 条件                                                 | アクション                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| 何らかの issue (challenger / verifier / adversarial) | merge をブロック、`/fix` を提案                                              |
| アーキテクチャ的な root cause を発見                 | `/think` で設計レビューを提案                                                |
| Adversarial test がカバレッジギャップを発見          | `/code` でテスト追加を提案                                                   |
| gate = Ready (caveat)                                | 環境を復旧して /assert を再実行 (または動的根拠ギャップを意識的に受け入れる) |

## Assertion

| Check                            | 必須 |
| -------------------------------- | ---- |
| Mode detected?                   | Yes  |
| Bootstrap attempted?             | Yes  |
| Phase 1 produced evidence?       | Yes  |
| Phase 2 challenger/verifier ran? | Yes  |
| Integrator produced report?      | Yes  |
| Gate decision displayed?         | Yes  |
| Worktree cleaned up?             | Yes  |
