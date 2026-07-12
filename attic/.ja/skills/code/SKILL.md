---
name: code
description: TDD/RGRC サイクルとリアルタイムテストフィードバックでコードを実装する。vertical slice のみ (テスト 1 件 → 実装 1 件の交互。テスト一括 → 実装一括は禁止)。小さなバグ修正やエラー解決には使わない (/fix を使用)。
when_to_use: 実装して, コード書いて, implement, coding
allowed-tools: Bash(npm run) Bash(npm run:*) Bash(yarn run) Bash(yarn run:*) Bash(yarn:*) Bash(pnpm run) Bash(pnpm run:*) Bash(pnpm:*) Bash(bun run) Bash(bun run:*) Bash(bun:*) Bash(cargo:*) Bash(make:*) Bash(git status:*) Bash(git log:*) Bash(which:*) Edit MultiEdit Write Read LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[implementation description]"
---

# /code - TDD 実装

テスト先行の RGRC サイクルで実装し、Spec の各 Test Scenario (T-NNN) を満たすプロダクトコードを品質ゲート通過済みの状態で残す。Spec が無い場合も、各変更をテスト先行で検証済みコードとして残す。

## 自己正当化への対処

| 自己正当化                | 反論                                            | 取るべき行動                                         |
| ------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| これは TDD には単純すぎる | 単純な変更ほどリグレッションを隠す              | 1 行でもテストを先に書く                             |
| テストは後で足す          | 後回しは負債化する                              | 今テストを書いてから実装する                         |
| これはただのリファクタ    | テストなしだとサイレントなリグレッションを招く  | 既存テストが green であることを確認してから着手する  |
| 既存テストでカバー済み    | 仮定は危険                                      | Red phase を実行してカバーを確認する                 |
| テストすると遅すぎる      | 遅いテストでも本番バグより速い                  | それでもテストを書く                                 |
| Red テストは検証不要      | 実行しない Red は、失敗の理由を確認できていない | Red を実行し、失敗理由が意図と一致することを確認する |

## 入力

`$ARGUMENTS` は実装記述を含む。必須で、空ならユーザーにプロンプトする。

## SOW コンテキスト

`${CLAUDE_SKILL_DIR}/../_lib/sow-resolution.md` を参照する。

## スコープガード

OUTCOME.md と SOW を読み込んだ後、Phase ごとのファイル数と outcome 整合性を確認する。下表の条件に当たれば、対応するアクションを取る。

| 条件                                                                 | アクション                            |
| -------------------------------------------------------------------- | ------------------------------------- |
| いずれかの Phase で 5 ファイル以上                                   | 停止し、`/think` で分割するよう求める |
| 実装が OUTCOME.md の Non-goals に踏み込む、または Constraints に抵触 | 停止し、ユーザーに確認する            |
| SOW がなく、`$ARGUMENTS` が 5 ファイル以上を示唆                     | まず `/think` の実行を提案する        |

## 実行

RGRC サイクルで framework / library の API を書くときは、記憶でなく pin バージョンの公式 docs に従う。`~/.claude/rules/development/SOURCING.md` に従い version drift を防ぐ。

| Step | アクション            | 詳細                                                                                                                 |
| ---- | --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 0    | Outcome Anchor        | `.claude/OUTCOME.md` を読む。不在なら `/outcome` で stub を生成                                                      |
| 1    | SOW コンテキスト      | SOW / spec を検出して読み、スコープガードを適用する                                                                  |
| 2    | `generator-test` 起動 | `subagent_type: generator-test`、`run_in_background: true`                                                           |
| 3    | テスト結果を受信      | `TaskOutput` で実装前に完了を待つ                                                                                    |
| 4    | テストレビュー        | `reviewer-coverage` を起動し、誤った assertion、脆弱 / トートロジーなテスト、意図不一致を実装前に解消する (advisory) |
| 5    | RGRC サイクル         | Green ごとに gates が自動リトライ。target (失敗 0 件) を保存 invariant (テスト削除 / skip なし) と対で満たす         |
| 6    | Review Gate           | `reviewer-readability` を起動する                                                                                    |
| 7    | Storybook フェーズ    | 条件付き。`${CLAUDE_SKILL_DIR}/references/storybook-phase.md` を参照                                                 |
| 8    | E2E フェーズ          | 条件付き。`${CLAUDE_SKILL_DIR}/references/e2e-phase.md` を参照                                                       |
| 9    | 品質ゲート            | `use-workflow-code` を参照。SOW があれば AC 達成を手動確認                                                           |

## Spec の進化

T-NNN は spec scenario の ID で、`T-\d{3}` 形式 (例: `T-001`)。テスト関数名、describe / it 文字列、または inline コメントに埋め込む。全テストを T-NNN にマップし、Spec トレースのないテストは追加しない。`evaluator-test` はこのマッピングからカバレッジ等の品質メトリクスを計算する。

実装中に新規要件 (edge case、エラー処理、統合の考慮点) が見つかったら、Spec を優先して次の順に進める。

1. spec.md の Test Scenarios 表に T-NNN を追加する
2. その T-NNN を参照するテストを、テスト名またはコメントに書く

## エラー処理

| エラー                               | アクション                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `generator-test` タイムアウト        | Leader が直接テスト生成                                                               |
| `generator-test` がテストを 0 件生成 | spec の存在を確認、ユーザーに確認                                                     |
| `reviewer-coverage` 起動不能         | スキップし Leader が直接テストを点検 (advisory)                                       |
| `reviewer-readability` 起動不能      | スキップし Leader が直接レビュー (advisory)                                           |
| テストランナー未検出 (非 JS/TS)      | task prompt にテストランナーを明示して再起動                                          |
| 品質ゲート失敗                       | commit 前に issue を修正                                                              |
| Evaluator metric が閾値以下          | uncovered / excess / duplicate / granularity / intent issue を修正                    |
| Evaluator タイムアウト               | gate をスキップ、警告ログ                                                             |
| Spec 見つからず                      | T-NNN trace なしで進む、Test Quality gate をスキップ (またはユーザーに spec 作成依頼) |
| `agent-browser` クラッシュ           | E2E をスキップ、advisory、続行                                                        |
| Dev server 到達不能                  | E2E をスキップ、advisory、続行                                                        |
| E2E テスト失敗                       | advisory (ブロックしない)                                                             |
| Storybook フェーズエラー             | フェーズをスキップ、advisory、続行                                                    |
