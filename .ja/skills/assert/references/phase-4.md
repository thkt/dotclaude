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

「この変更を安全にマージできるか」に 3 状態のいずれかで答え、スコアのような連続値は使わない。判定は § Gate ルール、降格は § Bootstrap 失敗処理を参照。

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

severity 正規化と `file:line` での重複除去 (衝突時は最高 severity を残しソースタグをリストに併合する) のルールは `${CLAUDE_SKILL_DIR}/scripts/merge-findings.py` が正で、Phase 1 の Finding 重複除去 (`${CLAUDE_SKILL_DIR}/references/phase-1.md` § Finding 重複除去) はこのスクリプトを直接実行する。integrator は同じルールを適用して統合する。統合後のセットが Gate ルールの `Issues` カウントの対象になる。

## Gate ルール

NotReady になるのは、build fail (build smoke 破損)、test fail、Issues が 1 件以上のいずれか。build smoke fail (`Build = fail`) は決して Ready (caveat) に分岐せず、環境的失敗 (`Build = skipped`) のみが分岐する (§ Bootstrap 失敗処理)。

`/assert` は独立した outcome チェックであり、issues はゼロのみ許容、1 件でもあればソースに関わらず NotReady とする。Severity (high/medium/low) は修正優先度のヒントとして issues リストに残るが、ゲート判定には影響しない。

| 入力   | Ready の必要条件                            | Ready (caveat) の必要条件        |
| ------ | ------------------------------------------- | -------------------------------- |
| Build  | pass (または skipped: build スクリプトなし) | skipped (bootstrap の環境的失敗) |
| Tests  | pass or no-runner                           | skipped (bootstrap の環境的失敗) |
| Issues | 0                                           | 0                                |

## Evidence 表

ゲートは § Gate Decode の decision JSON から決まり、この表から再計算しない。レポートには常に出力する。

| チェック    | 値                                                                         |
| ----------- | -------------------------------------------------------------------------- |
| Build       | pass or fail or skipped                                                    |
| Tests       | pass or fail (N passed, M failed) or skipped or no-runner                  |
| Issues      | 0 or N total. Breakdown by source: X challenger, Y verifier, Z adversarial |
| Adversarial | N/M passed (failed のうち triage で K promote) or skipped                  |

## Bootstrap 失敗処理

Bootstrap の失敗は 2 種類あり、orchestrator は両者を区別する。環境的失敗は worktree なし、ネット不通、install crash、build smoke 失敗は対象コードが build しないこと。build smoke fail を caveat に降格すると false-Ready (build 破損を見逃すマージ) になるため、caveat は環境的失敗に限定する。

| 失敗モード                  | Build 列  | Tests 列  | ゲート分岐                                               |
| --------------------------- | --------- | --------- | -------------------------------------------------------- |
| 環境的失敗 (worktree, deps) | `skipped` | `skipped` | Issues 0 なら Ready (caveat)、1 件以上なら NotReady      |
| build smoke 失敗            | `fail`    | `skipped` | Issues に関わらず NotReady (build fail はコードへの判定) |
| build スクリプトなし        | `skipped` | 続行      | 通常実行と同じ。build 列は参考情報のみ                   |

| コンポーネント | 環境的失敗後の扱い                                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Adversarial    | `skipped`。Issues カウントには寄与しない                                                           |
| Issues         | challenger / verifier は静的コードに対して実行され、ゲートには通常どおり効く (1 件以上で NotReady) |

## Gate Decode

leader は gate を prose から読まず、enhancer-evidence のレポート先頭にある fenced `json` decision ブロックを `${CLAUDE_SKILL_DIR}/scripts/gate-decode.py` で機械的に decode する。enum とクロスチェックの定義はスクリプト側が正。

decode が成功すれば、leader は decode した gate をそのまま最終 gate とする。唯一の降格が Ready から Ready (caveat) への変換で、bootstrap が環境的に失敗し、かつ decode した findings が 0 のときのみ適用する (§ Bootstrap 失敗処理)。

| #   | アクション                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | enhancer の Task 出力をファイルに保存し、gate-decode.py に渡す                                                                                   |
| 2   | exit 0 なら stdout の decision JSON (gate / findings / build / tests) をそのまま使う                                                             |
| 3   | exit 1 (ブロック欠落、パース失敗、enum 違反、クロスチェック不一致) なら enhancer を 1 度だけ再起動し、2 度目の失敗で NotReady に fail-close する |

## /goal 統合

完了を明示するのは `gate = Ready` のときのみ。Ready (caveat) と NotReady ではレポートを出力して継続し、完了を明示しない。Ready (caveat) で完了を明示しないのは、未テストの可能性があるコードで `/goal` ループを終わらせないため。
