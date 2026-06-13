# Phase 4: Evidence Synthesis と Gate 判定

`enhancer-evidence` による evidence 統合、三値ゲート (§ 三値ゲート) の判定、その decode を扱う。

`enhancer-evidence` を単一 background Task として起動する。入力は下表、返り値は root causes + Gate decision + report (blocker の構造化リストと修正案を含む)。`issues` セットの構築は § Issue Set 構築、判定は § Gate ルールを参照。

| 入力                | ソース                                                     | 処理 / 備考                              |
| ------------------- | ---------------------------------------------------------- | ---------------------------------------- |
| Outcome reference   | `.claude/OUTCOME.md` の Behavior / Non-goals / Constraints | Pre-flight でキャッシュ済                |
| Challenger output   | Raw challenger 出力                                        | enhancer-evidence が内部で突き合わせ     |
| Verifier output     | Raw verifier 出力                                          | enhancer-evidence が内部で突き合わせ     |
| Outcome evidence    | Bootstrap smoke test (build) + Phase 1c (test)             | 両者の結果を統合                         |
| Adversarial results | Phase 3 で promoted した findings                          | `[adversarial]` タグ付きで issues に統合 |

## 三値ゲート

「この変更を安全にマージできるか」に 3 状態のいずれかで答え、スコアのような連続値は使わない。判定は下記 § Gate ルール、降格は下記 § Bootstrap 失敗処理を参照。

| ゲート         | 意味                         |
| -------------- | ---------------------------- |
| Ready          | 完全検証クリア               |
| Ready (caveat) | 静的のみクリア・動的根拠欠如 |
| NotReady       | blocker あり                 |

## Outcome 基盤

安全の基準は `.claude/OUTCOME.md`。orchestrator が Pre-flight で読み、Behavior / Non-goals / Constraints を `enhancer-evidence` に渡す。不在なら `/outcome` で生成してから続行する。

Constraint に反する、または Non-goal に踏み込む finding も、issues セットでは同じ重みを持ち、challenger / verifier の指摘でも adversarial の promote でも入りうる。

## Issue Set 構築

integrator は、challenger / verifier による `reconciled findings` (Phase 1) と `promoted adversarial findings` (Phase 3) を 1 つの `issues` セットに統合する。ソースタグは `challenger` / `verifier` / `adversarial` の 3 種で、複数ソースで検出された finding は `[challenger, adversarial]` のようにすべてのタグを列挙する。

| Step | アクション                                                                                         |
| ---- | -------------------------------------------------------------------------------------------------- |
| 1    | `file:line` のみで重複除去する (category schema がソース間で異なるため、category はキーに含めない) |
| 2    | 衝突時は最高 severity を保持し、ソースタグはすべてリストで残す                                     |
| 3    | 統合後のセットが Gate ルールの `Issues` カウントの対象になる                                       |

## Gate ルール

NotReady になるのは、build fail (Step 4 smoke 破損)、test fail、Issues が 1 件以上のいずれか。Step 4 smoke fail (`Build = fail`) は決して Ready (caveat) に分岐せず、Step 1-3 env 失敗 (`Build = skipped`) のみが分岐する (§ Bootstrap 失敗処理)。

`/assert` は独立した outcome チェックであり、issues はゼロのみ許容、1 件でもあればソースに関わらず NotReady とする。Severity (high/medium/low) は修正優先度のヒントとして issues リストに残るが、ゲート判定には影響しない。

| 入力   | Ready の必要条件                            | Ready (caveat) の必要条件                |
| ------ | ------------------------------------------- | ---------------------------------------- |
| Build  | pass (または skipped: build スクリプトなし) | skipped (bootstrap Step 1-3 の env 失敗) |
| Tests  | pass or no-runner                           | skipped (bootstrap Step 1-3 の env 失敗) |
| Issues | 0                                           | 0                                        |

## Evidence 表

ゲートは § Gate Decode の decision JSON から決まり、この表から再計算しない。レポートには常に出力する。

| チェック    | 値                                                                         |
| ----------- | -------------------------------------------------------------------------- |
| Build       | pass or fail or skipped                                                    |
| Tests       | pass or fail (N passed, M failed) or skipped or no-runner                  |
| Issues      | 0 or N total. Breakdown by source: X challenger, Y verifier, Z adversarial |
| Adversarial | N/M passed (failed のうち triage で K promote) or skipped                  |

## Bootstrap 失敗処理

Bootstrap には 2 種類の失敗モードがあり、orchestrator は両者を区別しなければならない。Step 1-3 の失敗は環境的なもの (worktree なし、ネット不通、install crash) で、コードへの判定ではない。一方 Step 4 の失敗は対象コードが build しないというコードへの判定である。

両者を混同すると「build は壊れているが reviewer は何も見つけなかった」ケースが Ready (caveat) でマージに進み、三値ゲートが防ぐべき false-Ready になる。Ready (caveat) を環境的失敗に限定することで、動的根拠の欠如というシグナルを保持する。

| 失敗モード                            | Build 列  | Tests 列  | ゲート分岐                                               |
| ------------------------------------- | --------- | --------- | -------------------------------------------------------- |
| Step 1-3 fail (env: worktree, deps)   | `skipped` | `skipped` | Issues 0 なら Ready (caveat)、1 件以上なら NotReady      |
| Step 4 fail (build smoke broken)      | `fail`    | `skipped` | Issues に関わらず NotReady (build fail はコードへの判定) |
| build スクリプトなし (Step 4 skipped) | `skipped` | 続行      | 通常実行と同じ。build 列は参考情報のみ                   |

| コンポーネント | Step 1-3 fail 後の扱い                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Adversarial    | `skipped`。Issues カウントには寄与しない                                                           |
| Issues         | challenger / verifier は静的コードに対して実行され、ゲートには通常どおり効く (1 件以上で NotReady) |

## Gate Decode

leader は gate を prose から読まず、enhancer-evidence のレポート先頭にある fenced `json` decision ブロックを ${CLAUDE_SKILL_DIR}/scripts/gate-decode.py で機械的に decode する。prose から読むと最終段で自然言語の解釈が再混入するため、それを JSON contract で塞ぐ。enum とクロスチェックの定義はスクリプト側が正。

clean な decode 後、leader は decode した gate をそのまま最終 gate とする。唯一の降格が Ready から Ready (caveat) への変換で、bootstrap Step 1-3 が環境的に失敗し、かつ decode した findings が 0 のときのみ適用する (§ Bootstrap 失敗処理)。

| Step | アクション                                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | enhancer の Task 出力をファイルに保存し、gate-decode.py に渡す                                                                                   |
| 2    | exit 0 なら stdout の decision JSON (gate / findings / build / tests) をそのまま使う                                                             |
| 3    | exit 1 (ブロック欠落、パース失敗、enum 違反、クロスチェック不一致) なら enhancer を 1 度だけ再起動し、2 度目の失敗で NotReady に fail-close する |

## /goal 統合

完了を明示するのは gate = Ready のときのみ。`/goal` evaluator は会話出力のみから達成を判定するため、この一文が完了の evidence になる。Ready (caveat) と NotReady ではレポートを出力して継続し、完了を明示しない。

Ready (caveat) で完了を明示しないのは、テストされていない可能性のあるコードで `/goal` ループを終了させないため。継続すれば、ユーザーは環境復旧後の再実行か、ループを止めて caveat を意識的に受け入れるかを選べる。
