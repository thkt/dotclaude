---
name: build
description: challenge / checkout / research / think / code / 品質 / commit / pr を連結した実装オーケストレーター。前提の GO / NO-GO 検証からブランチ作成、設計、TDD 実装、内部 audit と外部 polish (Codex + cleanup) を積む品質層、コミット、PR 作成まで一気通貫で通す。新機能・リファクタリング・マイグレーションなど計画から実装までを要する作業全般に使う。計画済みの単一実装には使わない (/code を使う)。バグ修正には使わない (/fix を使う)。実装なしの計画のみにも使わない (/think を使う)。
when_to_use: 一気通貫で実装, 新機能, 計画を要するリファクタリング, 大規模マイグレーション, build, end-to-end implementation
allowed-tools: Skill Workflow Bash(npm run) Bash(npm run:*) Bash(npm test:*) Bash(yarn run) Bash(yarn run:*) Bash(pnpm run) Bash(pnpm run:*) Bash(bun run) Bash(bun run:*) Bash(make:*) Bash(git diff:*) Bash(git status:*) Bash(git log:*) Bash(git show:*) Bash(git ls-files:*) Bash(git worktree *) Bash(git merge *) Bash(git branch *) Bash(date:*) Bash(mkdir:*) Edit MultiEdit Write Read LS Task TaskCreate TaskList TaskUpdate AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[implementation task]"
---

# /build - 実装オーケストレーター

`/challenge` → `/checkout` → `/research` → `/think` → `/code` → 品質 → `/commit` → `/pr` を連結し、前提の GO 検証からテスト検証済み実装のコミットと PR 作成まで一気通貫で行う。新機能に限らずリファクタリングやマイグレーションも対象。Phase 2 の scope gate を通過したタスクでは、machinery フェーズを必ず Skill dispatch で通す。

## dispatch と inline の区別

このオーケストレーターの中核は、各サブスキルが spawn する critic-design / reviewer 群 / 外部 Codex にある。これらは build の会話コンテキスト内では再現できない。machinery フェーズの作業を inline で実行すると `Skill(X)` が発火せず、adversarial カバレッジが 0 に落ちる。think の SOW/Spec を叩く critic-design も、audit の reviewer 群も、polish の外部 Codex も一切通らないまま、orchestrator 単体の自己評価で実装が commit まで進む。これは build を呼んだ意味を失わせる。

| フェーズ群                                   | 扱い                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| challenge / research / think / code / polish | 必ず `Skill(X)` を呼び、返り値を待ってから次へ進む。inline 代替は禁止 (機構をバイパスする)       |
| audit                                        | 必ず `Workflow({name:"audit"})` を呼ぶ。fan-out を決定論 script が所有するため inline 代替は禁止 |
| checkout / commit / pr                       | 薄いラッパー。inline でも dispatch でも結果は同一。dispatch は任意                               |

## 入力

`$ARGUMENTS` から実装タスクの説明を取る (任意)。空なら何を実装するかを AskUserQuestion で問い合わせる。

## Phase 1: PREFLIGHT

1. CLAUDE.md, package.json, Cargo.toml などをコンテキストスキャン
2. PREFLIGHT を実行
3. 推論や不明点を解消
4. TaskCreate で追跡 (Phase 2-9)

## Phase 2: challenge + scope gate

`Skill("challenge", $ARGUMENTS)` を実行し、実装の前提を GO / NO-GO で検証する。前提検証と規模判定をここで兼ねる。

| challenge の結果                                                      | routing                                                                                                                                         |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| NO-GO                                                                 | 反証根拠を提示して停止                                                                                                                          |
| GO かつ 単一ファイル / 単一関心で decisions が空 (設計判断が残らない) | full build は過剰。AskUserQuestion で /code (計画済み単一実装) か /fix (バグ) への切り替えを提案し、選ばれたらそのスキルへ委譲して build を終了 |
| GO かつ 設計判断や複数レイヤーを含む                                  | Phase 3 以降のフルチェーンへ続行。Verdict / decisions / trade-offs / Actionable items を Phase 5 (think) の入力に渡す                           |

## Phase 3: ブランチ

`Skill("checkout", $ARGUMENTS)` を実行し、作業ブランチを作成する。薄いラッパーなので inline 可。開始時は diff が空なので命名は `$ARGUMENTS` を主軸にする。既にデフォルトブランチ外にいる場合はスキップする。

## Phase 4: research

`Skill("research", $ARGUMENTS)` を実行する。machinery フェーズなので dispatch 必須。inline で調査を代替すると advisor pass と subagent 群を飛ばす。未知が無ければスキップしてよいが、行うなら dispatch する。出力は `.claude/workspace/research/YYYY-MM-DD-<slug>.md`。Phase 5 が既存調査として検出する。

## Phase 5: 設計

`Skill("think", $ARGUMENTS)` を実行する。machinery フェーズなので dispatch 必須。inline で SOW/Spec を書くと critic-design の攻撃を飛ばす。Phase 2 の challenge 出力 (verdict / decisions / trade-offs) と Phase 4 の research 成果を入力に SOW + Spec を生成する。出力は `.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` + `spec.md`。

## Phase 6: 実装

`Skill("code", $ARGUMENTS)` を実行する。machinery フェーズなので dispatch 必須。inline で実装すると RGRC サイクルと品質ゲートを飛ばす。`/code` は Phase 5 出力から SOW を自動検出する。

## Phase 7: 品質

変更ファイルは `git diff main...HEAD --name-only` で取得する。audit と polish はどちらも machinery フェーズで dispatch 必須。inline で「レビューした」つもりになると reviewer 群と外部 Codex を飛ばす。Phase 6 (`/code`) が lint / type / test / readability / coverage の機械的ベースラインを通すため、Phase 7 は内部 audit と外部 polish の2レイヤーを積む。audit は security / resilience / causation / encapsulation の多次元レビューを adversarial challenge と severity 付きで通す。polish は外部 Codex (non-Claude 視点で Self-Enhancement バイアスを突く) と simplify / enhancer-code の cleanup を積む。残課題はユーザーに提示して判断を仰ぐ。

| Step | 動作                                                                                             | 終了条件                                            |
| ---- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| 1    | `Workflow({name:"audit"})` を diff に対して実行する (severity 付与、adversarial challenge)       | critical / high が 0 なら Step 3 へ                 |
| 2    | snapshot の critical / high finding を `Skill("fix", "<ID>")` で潰し、再 audit する (1 ラウンド) | critical / high が 0、または 3 ラウンドで Step 3 へ |
| 3    | `Skill("polish")` を uncommitted diff へ実行する (外部 Codex + cleanup、修正を直接適用)          | Codex 未導入なら cleanup のみで継続                 |
| 4    | テスト pass を確認する                                                                           | 失敗時は最大 2 回修正。なお失敗なら残課題を提示     |

polish の修正がテストを壊したら polish 内で stash する。残課題は Phase 8 commit 前に提示する。

## Phase 8: commit

品質層と全テスト pass の後に `Skill("commit", ...)` を実行し、変更を Conventional Commits 形式でコミットする。薄いラッパーなので inline 可。planning 成果物と実装が 1 コミットに入る。残課題が未解決なら commit 前にユーザーに提示する。

## Phase 9: PR

`Skill("pr", $ARGUMENTS)` を実行し、コミットした変更から PR を作成する。薄いラッパーなので inline 可。ただし本文プレビューと AskUserQuestion での作成確認は inline でも再現する。

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
| `/pr` 失敗・キャンセル                    | エラーを提示しユーザーに尋ねる         |

## 完了条件

以下は Phase 2 の scope gate をフルチェーンで通過した場合の基準。/code や /fix へ redirect した場合は委譲先の完了基準に従う。全項目を満たすまで終了しない。満たせない項目は、理由をユーザーに提示する。

- [ ] PREFLIGHT 通過
- [ ] challenge GO 判定
- [ ] 作業ブランチ作成
- [ ] SOW + Spec 生成済み
- [ ] 全テスト pass
- [ ] `/code` AC カバレッジ
- [ ] polish 通過 (Codex review + cleanup)
- [ ] コミット済み
- [ ] PR 作成済み
