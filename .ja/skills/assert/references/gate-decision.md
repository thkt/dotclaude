# Gate Decision（ゲート判定）

/assert の Ready/NotReady バイナリ判定。reconciled evidence から導出、数値スコアなし。

## アウトカム基準

ゴール:「このchangeは安全にマージできるか？」にbinary signalで答える。NotReadyの場合、
blockers と修正案を構造化して提示。

判定ルール: 任意の reconciled finding、build失敗、test失敗、adversarial失敗がgateをブロック。
dynamic evidence が欠落している (bootstrap skipped) 状態は、それ自体では block しない。
absence of evidence is not evidence of absence。

## Gate ルール

| 入力                           | Ready のための必要条件                    |
| ------------------------------ | ----------------------------------------- |
| Build                          | pass（bootstrap 失敗時は skipped 可）     |
| Tests                          | pass / no-runner（または skipped）        |
| Reconciled findings            | 0                                         |
| Adversarial 失敗               | 0（または skipped）                        |

Ready = 上記4つの条件すべて満たす。
NotReady = いずれかの条件が失敗。

Zero-tolerance on findings: /assert は独立した outcome check。1件の reconciled finding
でも block 条件として十分。Severity (high/medium/low) は findings list に対応優先度の
ヒントとして保持されるが、Ready/NotReady の gate 判定には使われない。

## Evidence テーブル

常に出力する情報テーブル。スコアではない。

| Check       | Value                                           |
| ----------- | ----------------------------------------------- |
| Build       | pass / fail / skipped                           |
| Tests       | pass / fail (N passed, M failed) / skipped / no-runner |
| Findings    | 0 / N high, M medium, L low                     |
| Adversarial | N/M passed / skipped                            |

## Bootstrap 失敗時の扱い

Phase 0 bootstrap 失敗時、dynamic evidence は取得不可。static findings が gate を駆動。

| Component   | bootstrap 失敗時の扱い                                    |
| ----------- | --------------------------------------------------------- |
| Build       | `skipped`。Ready を block しない                          |
| Tests       | `skipped`。Ready を block しない                          |
| Adversarial | `skipped`。Ready を block しない                          |
| Findings   | Reviewer は static code で走る。gate に full weight で貢献 |

根拠: bootstrap 失敗は環境要因であり、コードへの verdict ではない。
blocker として扱うと環境破損時にすべての run がペナルティを受ける。

## レガシーフォーマット処理

過去の /assert report は Trust Score (NN/100) 形式の可能性あり。Diff from Previous
セクションはこれを検出して `Legacy format: diff skipped` を出す。

## Ralph Loop 統合

| 条件              | アクション                                       |
| ----------------- | ------------------------------------------------ |
| gate = Ready      | `<promise>PASS</promise>` を出力、ループ終了    |
| gate = NotReady   | Blockers を Fix例とともに出力、イテレーション継続 |
