# Gate Decision

/assert における三値判定 Ready / Ready (caveat) / NotReady。統合された根拠から導出される。スコア値は使わない。

## Outcome Basis

Goal: 「この変更を安全に merge できるか」に離散シグナルで答える。「完全検証クリア」「静的のみクリア (動的根拠欠如)」「ブロッカーあり」を区別する。あわせて blocker の構造化リストと修正案を出す。

「安全に」の基準は `.claude/OUTCOME.md`。orchestrator は Pre-flight でこれを読み、Behavior / Non-goals / Constraints を文脈として enhancer-evidence に渡す。Constraint に反する findings、Non-goal に踏み込む findings は issues セットで通常権重を持つ (challenger / verifier が flag、adversarial が promote する場合あり)。OUTCOME.md が不在なら orchestrator は `rules/core/OUTCOME.md` § 不在時の振る舞い に従い対話的に stub を生成してから続行する。

判定ルール: いずれかの issue または test 失敗があればゲートを NotReady とする。Bootstrap 失敗単独では NotReady にしないが、動的根拠が欠如するためクリーンな Ready を Ready (caveat) に降格する。

## Issue Set 構築

integrator は `reconciled findings` (Phase 1 で重複除去された findings に対する challenger / verifier) と `promoted adversarial findings` (Phase 3 intent triage の生存者) を 1 つの `issues` セットに統合する。

| Step | アクション                                                       |
| ---- | ---------------------------------------------------------------- |
| 1    | `file:line` のみで重複除去。Category schema はソース間で異なる   |
| 2    | 衝突時: 最高 severity を保持、ソースタグはすべてリストとして残す |
| 3    | 統合後セットが Gate Rule の `Issues` カウントの対象              |

ソースタグ: `challenger`, `verifier`, `adversarial`. 複数ソース検出はすべてのタグを表示。例: `[challenger, adversarial]`。

## Gate Rule

| 入力   | Ready の必要条件                            | Ready (caveat) の必要条件                |
| ------ | ------------------------------------------- | ---------------------------------------- |
| Build  | pass (または skipped: build スクリプトなし) | skipped (bootstrap Step 1-3 の env 失敗) |
| Tests  | pass / no-runner                            | skipped (bootstrap Step 1-3 の env 失敗) |
| Issues | 0                                           | 0                                        |

Ready = bootstrap 完全成功 AND build pass (または build スクリプトなし) AND tests pass/no-runner AND Issues = 0. Ready (caveat) = bootstrap Step 1-3 失敗 (env) AND Issues = 0; build/tests は skipped と記録。NotReady = build fail (Step 4 smoke 破損)、test fail、Issues > 0 のいずれか。

重要: Step 4 smoke fail (`Build = fail`) は決して Ready (caveat) に分岐しない。Step 1-3 env 失敗 (`Build = skipped`) のみが分岐する。下記 Bootstrap Failure Handling を参照。

issues に対するゼロ容認: /assert は独立 outcome チェック。1 件でも issue があれば、ソースに関わらず NotReady。Severity (high/medium/low) は issues リスト内に修正優先度ヒントとして保持されるが、Ready/Ready (caveat)/NotReady のゲート決定には影響しない。

## Evidence Table

参考情報、常に出力。スコアではない。

| Check       | Value                                                                     |
| ----------- | ------------------------------------------------------------------------- |
| Build       | pass / fail / skipped                                                     |
| Tests       | pass / fail (N passed, M failed) / skipped / no-runner                    |
| Issues      | 0 / N total. Breakdown by source: X challenger, Y verifier, Z adversarial |
| Adversarial | N/M passed (M failed → triage promoted K) / skipped                       |

## Bootstrap Failure Handling

Bootstrap には 2 種類の失敗モードがあり、ゲート結果が分岐する。orchestrator は両者を区別しなければならない。

| 失敗モード                            | Build 列  | Tests 列  | ゲート分岐                                               |
| ------------------------------------- | --------- | --------- | -------------------------------------------------------- |
| Step 1-3 fail (env: worktree, deps)   | `skipped` | `skipped` | Issues=0 なら Ready (caveat)、Issues>0 なら NotReady     |
| Step 4 fail (build smoke broken)      | `fail`    | `skipped` | Issues に関わらず NotReady (build fail はコードへの判定) |
| build スクリプトなし (Step 4 skipped) | `skipped` | 続行      | 通常実行と同じ。build 列は参考情報のみ                   |

| コンポーネント | Step 1-3 fail 後の扱い                                                                |
| -------------- | ------------------------------------------------------------------------------------- |
| Adversarial    | `skipped`. Issues カウントには寄与しない                                              |
| Issues         | challenger / verifier は静的コードに対して実行される。フルゲート権重 (>0 で NotReady) |

理由: Step 1-3 失敗は環境的 (worktree なし、ネット不通、install crash) でコードへの判定ではない。NotReady にすると壊れた環境での実行がすべて無駄になる。Step 4 失敗は assert 対象コードが build しないという判定で、これは NotReady でなければならない。混同すると "build is broken but reviewers found nothing" が Ready (caveat) として merge に出てしまう。これこそが三値ゲートが防ぐべき false-Ready 結果。

Ready (caveat) は正当な環境的事象に限り、動的根拠ギャップシグナルを保持する。

## /goal 統合

| 条件                  | アクション                                                   |
| --------------------- | ------------------------------------------------------------ |
| gate = Ready          | `gate = Ready` を明示。`/goal` evaluator が完了を読み取る    |
| gate = Ready (caveat) | Blockers (none) + caveat note を出力。継続。完了を明示しない |
| gate = NotReady       | Blockers と Fix 提案を出力。継続。完了を明示しない           |

Ready (caveat) で完了を明示しない理由: `/goal` ループは未テスト可能性のあるコードで終了すべきでない。継続することで、ユーザーが環境を復旧して再実行する余地、または手動でループを止めて caveat を意識的に受け入れる余地を残す。
