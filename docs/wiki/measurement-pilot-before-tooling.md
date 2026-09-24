---
globs: []
scenes: ["plan", "issue-create"]
---

# 有料の実走や計測 CLI を作る前に、最小の pilot で測定が verdict を出せるかを確かめる

## 内容

計測の仕組みを作り込む前に、1 対象と少ない run 数で pilot を実走し、測定の前提が実物で成り立つかを確かめる。前提が崩れていると、CLI や corpus を作っても「測れない」という結果に費用を払うことになる。pilot が前提の崩れを示したら、仕組みを作らずに issue を閉じ、測る問いを決め直す。

## 定型手順

1. 測定が verdict を出すために実物で成り立つ必要がある前提を書き出す。skill-reference の測定では「reviewer が対象の reference を Read する」がこれに当たる
2. 1 対象、arm あたり少数の run で pilot を実走し、前提の成否と 1 run の費用を記録する
3. 前提が成り立たなければ、CLI、corpus、実走の自動化を作らずに issue を閉じ、結果と次に測る問いを close コメントに残す
4. 前提が成り立った対象だけを、計測の仕組みを作る次の issue にする

## 参照コード

- `skills/ablate/scripts/reference_observation.ts` の `observe_arm`（露出した run だけを数え、数えた run が `RUN_COUNT` に満たない arm の complies を null にする。露出 0 の reference はここで unmeasured になる）
- `skills/ablate/scripts/arms.ts` の `RERUN_CAP`（露出不足や汚染で捨てた run を補う追加試行の暫定上限）

## 根拠

- #744 readability/control-flow.md を測る CLI を作る前に、opus で 10 run の pilot を走らせた (計 $0.48)。露出は 0/10 で、露出した run だけを数える集約では全 arm が unmeasured になると分かり、CLI を作らずに close した。pilot は skill-reference arm の部品の不具合も 3 件見つけた
- #748 残り 3 つの reviewer reference を CLI の対象にする前に、各 10 run で露出を測った。露出は 0/30 で、reference を空にした wiped arm でも仕込んだ欠陥を 15/15 で当てた
