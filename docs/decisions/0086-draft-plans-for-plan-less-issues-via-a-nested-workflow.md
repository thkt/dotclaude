---
status: "accepted"
date: 2026-07-14
decision-makers: thkt
---

# ADR-0086: Plan 節なし issue の plan を nested workflow で自律生成する

## Context and Problem Statement

ADR-0085 は build を選択ベース検証へ寄せ、その帰結として Plan 節の無い issue を stopped: no-plan で fail-close し、/think + /issue の精緻化を促す設計にした。運用してみると、状態 (goal) の書かれていない雑な issue をそのまま build に流したい場面が残る。build が自律的にゴールを設定し plan を起こして検証まで通せれば、精緻化の手戻りなしに fire-and-forget が成立する。

一方 ADR-0085 以前は生成処理が build.js の Load に inline で埋まり、Plan 節あり / なしの二分岐が Load を膨らませて見通しを悪くしていた。今回は生成の是非でなく、生成処理の置き場が論点になる。

## Decision Drivers

- Plan 節なし issue でも fire-and-forget を成立させたい。ゴール未設定なら build が設定する
- ADR-0085 の選択ベース検証の核 (Verify / Cleanup / conformance) は維持する。変えるのは Load の plan 取得だけ
- 生成 + critic-design gate の重い処理を build.js から外し、build を 2 つの plan ソースを捌く薄い dispatcher に保つ
- 生成 plan の状態目標は a11y 対応を含む (UI に触れる issue でキーボード操作性やスクリーンリーダー通知を criteria に入れる)

## Considered Options

- Option A: 生成処理を nested workflow draft-plan.js に外出しし、build は Plan 節なしのとき sibling("draft-plan") を呼ぶ
- Option B: ADR-0085 以前のように build.js Load に inline で生成を戻す
- Option C: fail-close を維持し、自律生成はしない (ADR-0085 のまま)

## Decision Outcome

Option A を採用する。build.js Load は Plan 節の有無で 2 分岐し、あり側は従来どおり抽出 + id クロスチェック、なし側は sibling("draft-plan") を呼ぶ。生成 plan は build.js の validate (canonical な構造 gate) を両ソース共通で通す。

draft-plan.js の責務は、issue 本文からのリポジトリ探索 + plan 生成 (ゴール自律設定、a11y criteria 込み) と、人間未レビューを補う critic-design gate。NO-GO なら stopped: generated-plan-rejected を返し、GO なら「自動生成で未レビュー」を assumptions 先頭に固定して plan を返す。

### Consequences

- Good, because Plan 節なし issue でも build が完走し、ゴール設定と検証まで自律で進む
- Good, because 生成の重い処理が build.js から外れ、Load が 2 ソースの薄い分岐になる
- Good, because draft-plan は進捗 UI で独立グループになり、生成が動いていることが観測できる
- Bad, because 人間未レビューの生成 plan が軽い担保 (critic-design gate + 構造 validate) で Code へ進む。ADR-0085 の「検証済みの選択だけ実装する」原則を、生成 path に限って緩める
- Bad, because plan schema が build.js と draft-plan.js に重複する (workflow script は自己完結で共有 import が無いため)

### Confirmation

workflows/build/tests/build.behavior.test.js が、Plan 節なし本文で draft-plan workflow を呼び Ship まで進むこと、stopped 値 snapshot に no-plan が無く plan-generation-failed があることを pin する。workflows/draft-plan/tests が、生成 happy path で plan を返すこと、critic NO-GO で stopped: generated-plan-rejected を返すことを検証する。

## More Information

- ADR-0085 の no-plan 判断を改める (Amends ADR-0085)。選択ベース検証の核は維持する
- 生成 path の critic-design gate は Plan 節あり path の id クロスチェックに相当する安全機構
