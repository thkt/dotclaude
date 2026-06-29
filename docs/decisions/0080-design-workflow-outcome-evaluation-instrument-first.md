---
status: "accepted"
date: 2026-06-24
decision-makers: thkt
---

# ADR-0080: skill/workflow 成果の評価を instrument-first で設計する

## Context and Problem Statement

Zenn 記事 (shark_same_same「評価機」論, 2026) は、自己改善ハーネスで最も重要かつ最も作るのが難しい部品は評価機 (grader) であり、設計初日から作り込むべきだと主張する。弱い評価機は reward hack され (Goodhart / specification gaming)、ホールドアウト無しの過学習が実運用で頻発する (SIA は3タスク中2つが train/test split 無し) と名指しする。

この harness は /build /code /think /fix 等の workflow を持つが、その「成果の質」(生成コード・PR・設計の出来) を測る評価機が無い。質を採点したいが、質には一意の正解が無く、単純な採点器を据えれば記事の警告どおり過学習と reward hack に晒される。

既存の決定論 hook (gates / assay / formatter) は test 実パス・lint・型・新規テスト有無を gate するが、これは成果の質の measure ではなく floor を守るに過ぎない。「trivial test を足すだけで gate 満点・実際は何も解いていない」は gate を満たしつつ outcome を満たさない reward hack そのもの。

実測すると human-authored PR は週 81 件 (60日で649、renovate/bot は別129) で、採点に使えるデータ量の制約は無い。律速は別にあり、各 run に「どの workflow 起源か」「後で revert / 手戻りしたか」という outcome ラベルが付いていない。

## Decision Drivers

- 成果の質は一意の正解が無く、単純な採点器は過学習・reward hack される (記事 §4)
- 決定論 gate は floor であって measure ではなく、gates/assay/formatter で既に hook 稼働済み = 新規成果ではない
- ground truth は現場信号 (merge 生存 / revert / 手戻りコミット) にしか接地しない
- human PR は週 81 件でデータ量は足りるが、outcome ラベルが未取得
- CLAUDE.md Completion matrix が task-type 別の成功条件を既に持つ (Feature→新規テスト、Fix→root cause、Investigation→normal-case 理解)
- 採点器は最適化ループの外に grounding して初めて gameable でなくなる (hacker/fixer 分離)

## Considered Options

- Option A: instrument-first。全 workflow run と最終 outcome をログする基盤を先に据え、採点ロジックはデータが溜まってから育てる
- Option B: golden set 採点器を今すぐ作る。過去 issue を再投入して採点ルールを書き下ろす
- Option C: LLM-judge を gate にする。生成成果を judge agent が合否判定する
- Option D: 何もしない。既存の決定論 gate (gates/assay/formatter) で十分とみなす

## Decision Outcome

Option A を採用する。第一の成果物は採点器そのものではなく instrumentation。全 workflow run と outcome を1レコードとしてログする基盤を先に据え、採点ロジックは溜まったデータで育てる。記事が名指しした失敗 (ホールドアウト無しの過学習採点器) を設計初日に避ける唯一の形がこれであり、ground truth が未取得なまま採点器を書けば必ず gameable になる。

### 評価機の部品と序列

| 層                                                    | 役割                            | 位置づけ                                                                               |
| ----------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| 現場信号 (merge 生存 / revert / 手戻りコミット)       | ground truth の anchor          | 最重要。成果の質を外部接地する唯一の信号                                               |
| 決定論 gate (test 実パス / 新規テスト有無 / lint・型) | anchor に照らす安価な proxy     | 既存 hook を再利用。一次信号ではない                                                   |
| golden replay set + holdout                           | 回帰。過去 issue を再投入し採点 | データが溜まってから。ホールドアウトは厳格分離                                         |
| LLM-judge (設計妥当性)                                | 補助のみ                        | gate にしない。一致率は高いが欠陥検出率は低い                                          |
| 成功条件・失敗分類                                    | 採点の定義                      | CLAUDE.md Completion matrix を再利用。task-type ごとに別評価機 (/think ≠ /code ≠ /fix) |

### 最小の第一歩

workflow run ごとに1レコード追記する。`{skill, task-type, branch/issue, gate結果, merged?, N日以内のrevert?, follow-up fix commit数}`。recall / chronicler が既に edit ログを持つため、その上に outcome 列を足す形が最短。

### Consequences

- Good, 採点器を ground truth 取得前に書かないため、記事 §4 の過学習・gameable 採点器を設計初日に回避する
- Good, ground truth を現場信号に格上げし、決定論 gate を proxy に降格したことで、既存 hook を成果と取り違える錯誤が消える
- Good, 評価機を task-type ごとに分けるため、/think と /code の成功条件の取り違えが起きない
- Good, 成功条件・失敗分類を CLAUDE.md Completion matrix に anchor するため新規発明が要らない
- Bad, 採点器が即座に手に入らない。outcome ラベルが一定量溜まるまで定量スコアは出せず、その間は instrumentation のみ
- Bad, 現場信号 (revert / 手戻り) は遅延信号で、run 直後には確定しない。N日窓を待つ必要がある
- Bad, ログ基盤の追加実装コスト (recall/chronicler 上の outcome 列) が別タスクとして発生する

### Confirmation

本 ADR は設計決定の記録に留め、実装は別タスク。instrument-first の方針 (anchor=現場信号、gate=proxy、採点器は運用で育てる、評価機は task-type ごと) が記録され、README に登録されていることを確認する。ログ基盤の実装着手はユーザー判断を待つ。

## Pros and Cons of the Options

### Option A (instrument-first)

- Good, ground truth 取得を採点器に先行させ、過学習と reward hack を構造的に回避する
- Good, 既存 hook と Completion matrix を再利用し新規発明を最小化する
- Bad, 定量スコアが即座には出ず、データ蓄積期間が必要

### Option B (golden set 採点器を今すぐ作る)

- Good, 採点器が即座に手に入る
- Bad, outcome ラベル無しのまま書くため ground truth に接地せず、記事 §4 の gameable 採点器になる。holdout 分割の母数も未確定

### Option C (LLM-judge を gate にする)

- Good, 任意の成果に対し即座に合否を返せる
- Bad, LLM-judge は人間一致率は高いが欠陥検出率が低く、gate に置くと reward hack を見逃す (feedback_no-llm-self-confidence-as-gate と整合)

### Option D (既存 gate で十分とする)

- Good, 追加コストゼロ
- Bad, 決定論 gate は floor であって質の measure ではなく、「trivial test で gate 満点」型の reward hack を素通しする。評価したい対象 (成果の質) を測れていない

## Reassessment Triggers

- outcome ラベルが holdout 分割に耐える量まで溜まった場合、golden replay set と定量採点器の設計に着手する
- 現場信号 (revert / 手戻り) が遅延しすぎて proxy として機能しない場合、決定論 gate と LLM-judge の重み付けを再検討する
- LLM-judge の欠陥検出率が改善し gate 化に耐えるエビデンスが出た場合、補助から gate への昇格を再判断する
- workflow の利用頻度が大きく下がりデータ蓄積率が holdout を支えられなくなった場合、評価対象を高頻度 skill に絞る
