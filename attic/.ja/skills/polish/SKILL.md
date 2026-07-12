---
name: polish
description: Codex レビュー + クリーンアップ。findings は critic-audit が challenge し事実として集約せず、修正を直接適用する。内部 multi-reviewer の deep audit や findings 報告には使わない (/audit を使う)。
when_to_use: 整理して, きれいにして, コード整理, slop除去, ポリッシュ, テスト整理, テスト監査, Codex レビュー
allowed-tools: Bash(codex:*) Bash(git diff:*) Bash(git log:*) Bash(git stash:*) Bash(git status:*) Bash(cargo test:*) Bash(npm test:*) Bash(npm run test:*) Bash(bun test:*) Bash(pnpm test:*) Bash(yarn test:*) Bash(make test:*) Bash(which:*) Read Edit Skill Task AskUserQuestion
model: opus
argument-hint: "[target scope]"
---

# /polish - Codex レビュー + クリーンアップ

Codex でレビューし、findings を `critic-audit` が adversarial challenge にかける。生き残りを修正し、`/simplify` と `enhancer-code` でクリーンアップする。findings の報告で終わらず、修正を直接適用する。内部レビュワーによる監査が必要なら `/audit` を使う。

## 入力

`$ARGUMENTS` には対象スコープを渡せる。空なら `git diff HEAD` (staged + unstaged) を分析する。

## Phase 1: Codex レビュー

外部の Codex レビューを実行して findings を出す。`which codex` が失敗したら Phase 3 に進む。

`codex review "Review for logic, architecture, data flow, and code simplicity (flag over-complexity and unnecessary indirection)"` を実行する。codex が自前で `git status` を読み、staged / unstaged / untracked の変更を検出してレビューする。PROMPT を省くと Codex 既定のレビューになり単純化観点が抜けるため必ず渡す。

## Phase 2: Adversarial challenge と修正

`critic-audit` が Codex の false positive を絞り込んでから、生き残った findings を直接修正する。

1. 各 finding を `critic-audit` の入力スキーマにマップし (`critic-audit` § Input)、全リストを渡して `Task(subagent_type: "critic-audit")` を 1 回起動する。finding ごとの verdict を待つ
2. 各 finding を verdict で下表に従って triage する
3. 生き残りから、Codex の P1 / P2 を残す。Phase 3 の領域 (クリーンアップ対象) と、`git diff` スコープ外のファイルに触れる修正は捨てる
4. 生き残りを high severity 優先で修正し、テストコマンドを検出して検証する。テストを壊す修正は `git stash` する

| verdict       | 動作                               |
| ------------- | ---------------------------------- |
| confirmed     | 修正候補として残す                 |
| disputed      | 捨てる                             |
| downgraded    | 下げた severity を適用             |
| needs_context | 1 行サマリ付きでユーザーに提示する |

## Phase 3: コードクリーンアップ

2 つのクリーンアップ mutator が Phase 2 後の diff に対して順番に実行され、その後検証する。どちらもバグ探しはしないので、`critic-audit` の challenge を経ず修正を直接適用する。

1. 現在の diff に対して `Skill("simplify")` をクリーンアップ専用パス (再利用、簡素化、効率、抽象度) として実行する。引数なしの起動を拒否されたら、Phase 1 で検出した diff スコープを渡す
2. `Task(subagent_type: "enhancer-code")` で `enhancer-code` を起動し、AI slop の除去と simplification ルールの適用、テストの監査を行う。`/simplify` の後に実行し、その preservation rule (迷ったら残す) を `/simplify` の編集に対して優先させる
3. テストコマンドを検出して検証する。失敗時はクリーンアップ編集を `git stash` する

## 出力

各 Phase で何をしたかを簡潔に報告する。Codex の findings (Phase 1)、critic-audit の verdict 件数と適用した修正・スキップ理由 (Phase 2)、`/simplify` と `enhancer-code` の編集を `file:line` 付きとテスト検証結果 (Phase 3)。

## エラー処理

| エラー                           | 動作                                      |
| -------------------------------- | ----------------------------------------- |
| diff に変更なし                  | 変更がない旨を報告                        |
| `codex review` 失敗              | findings なしで Phase 3 へ進む            |
| `critic-audit` が失敗 / 空を返す | 全 findings を confirmed 扱いで修正へ進む |
| `/simplify` 利用不可 / 失敗      | `enhancer-code` に進む                    |
