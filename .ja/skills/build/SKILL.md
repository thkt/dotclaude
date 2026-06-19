---
name: build
description: challenge / checkout / research / think / code / 品質 / commit を連結した実装オーケストレーター。前提の GO / NO-GO 検証からブランチ作成、設計、TDD 実装、code-review + audit の品質層、コミットまで一気通貫で通す。新機能・リファクタリング・マイグレーションなど計画から実装までを要する作業全般に使う。計画済みの単一実装には使わない (/code を使う)。バグ修正には使わない (/fix を使う)。実装なしの計画のみにも使わない (/think を使う)。
when_to_use: 一気通貫で実装, 新機能, 計画を要するリファクタリング, 大規模マイグレーション, build, end-to-end implementation
allowed-tools: Skill Bash(npm run) Bash(npm run:*) Bash(npm test:*) Bash(yarn run) Bash(yarn run:*) Bash(pnpm run) Bash(pnpm run:*) Bash(bun run) Bash(bun run:*) Bash(make:*) Bash(git diff:*) Bash(git status:*) Bash(git log:*) Bash(git show:*) Bash(git ls-files:*) Bash(git worktree *) Bash(git merge *) Bash(git branch *) Bash(date:*) Bash(mkdir:*) Edit MultiEdit Write Read LS Task TaskCreate TaskList TaskUpdate AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[implementation task]"
---

# /build - 実装オーケストレーター

`/challenge` → `/checkout` → `/research` → `/think` → `/code` → 品質 → `/commit` を連結し、前提の GO 検証からテスト検証済み実装のコミットまで一気通貫で行う。新機能に限らずリファクタリングやマイグレーションも対象。全フェーズを必須実行する (早期終了なし)。

## 入力

`$ARGUMENTS` から実装タスクの説明を取る (任意)。空なら何を実装するかを AskUserQuestion で問い合わせる。

## Phase 1: PREFLIGHT

1. CLAUDE.md, package.json, Cargo.toml などをコンテキストスキャン
2. PREFLIGHT を実行
3. 推論や不明点を解消
4. TaskCreate で追跡 (Phase 2-8)

## Phase 2: challenge

`Skill("challenge", $ARGUMENTS)` を実行し、実装の前提を GO / NO-GO で検証する。

- NO-GO なら、反証の根拠を提示して停止する。
- GO なら、Verdict / decisions / trade-offs / Actionable items を Phase 5 (think) の入力に渡す。

## Phase 3: ブランチ

`Skill("checkout", $ARGUMENTS)` を実行し、作業ブランチを作成する。開始時は diff が空なので命名は `$ARGUMENTS` を主軸にする。既にデフォルトブランチ外にいる場合はスキップする。

## Phase 4: research

`Skill("research", $ARGUMENTS)` を実行する。出力は `.claude/workspace/research/YYYY-MM-DD-<slug>.md`。Phase 5 が既存調査として検出する。

## Phase 5: 設計

`Skill("think", $ARGUMENTS)` を実行する。Phase 2 の challenge 出力 (verdict / decisions / trade-offs) と Phase 4 の research 成果を入力に SOW + Spec を生成する。出力は `.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` + `spec.md`。

## Phase 6: 実装

`Skill("code", $ARGUMENTS)` を実行する。`/code` は Phase 5 出力から SOW を自動検出する。

## Phase 7: 品質

変更ファイルは `git diff main...HEAD --name-only` で取得する。残課題はユーザーに提示して判断を仰ぐ。

| Step | 動作                                                                                  | 終了条件                                         |
| ---- | ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1    | `Skill("code-review", "medium")` で選別                                               | high / critical なし → Step 4 へ                 |
| 2    | high / critical が残れば `Skill("audit")` で深掘り検証                                | 0 critical / high → Step 4 へ                    |
| 3    | Step 2 snapshot の critical / high finding ID で `Skill("fix", "<ID>")` → iteration++ | max 3 到達または解消 → Step 4 へ                 |
| 4    | テスト pass を確認                                                                    | テスト失敗 → 修正 (max 2)。なお失敗 → 残課題提示 |

## Phase 8: commit

品質 + テスト pass の後に `Skill("commit", ...)` を実行し、変更を Conventional Commits 形式でコミットする。planning 成果物と実装が 1 コミットに入る。残課題が未解決なら commit 前にユーザーに提示する。

## 再開

既存成果物から resume 地点を検出する。challenge は永続成果物を残さないため、research 成果物の有無を最初の検出キーにする。デフォルトブランチ上のままなら該当 Phase の前に Phase 3 (checkout) を通す。再入時は残フェーズを TaskCreate してから継続する (Phase 1 を飛ばすため list が作られない)。

| 成果物                       | 再開地点            |
| ---------------------------- | ------------------- |
| research なし & SOW なし     | Phase 2 (challenge) |
| research あり & SOW なし     | Phase 5 (think)     |
| SOW `draft`                  | Phase 5 (think)     |
| SOW `in-progress` で実装なし | Phase 6 (code)      |
| 実装済みで品質チェック未完了 | Phase 7 (品質)      |
| 品質 pass で未コミット       | Phase 8 (commit)    |

## エラー処理

| エラー                                    | 動作                                   |
| ----------------------------------------- | -------------------------------------- |
| `/challenge` が NO-GO                     | 反証根拠を提示して停止                 |
| `/checkout` がブランチ既存                | 代替名を提案、または既存ブランチで継続 |
| `/research` / `/think` がキャンセル・失敗 | コンテキストを保存して終了             |
| `/code` 失敗                              | エラーを提示しユーザーに尋ねる         |
| 品質ループ枯渇 (3 ラウンド)               | 残りを提示しユーザーが判断             |
| `/code` 品質ゲートが AC 未達を表示        | Phase 6 か 7 への再入を提案            |
| `/commit` 失敗                            | エラーを提示しユーザーに尋ねる         |

## 検証

全項目を満たすまで終了しない。満たせない項目はユーザーへ理由を提示する。

- challenge GO 判定
- 作業ブランチ作成
- PREFLIGHT 通過
- SOW + Spec 生成済み
- 全テスト pass
- `/code` AC カバレッジ
- コミット済み
