---
globs: []
scenes: ["plan"]
---

# 並行 issue 間の T-NNN 採番範囲の予約

## 内容

同じ「wave」として並行に着手する複数の issue の Plan は、受け入れテストの T-NNN 番号域が重ならないよう、着手前に互いの範囲を予約し合う。各 Plan の Rules に、自分が使う範囲と他 issue が予約済みの範囲を明記する。

## 定型手順

1. 同じ波で並行する他の issue の Plan がどの T-NNN 範囲を使っているかを確認する
2. 自分の Plan の T-NNN をその続きから採番する
3. Plan の Rules に、自分の範囲と他 issue の既知の範囲を並べて書く

## 参照コード

- `workflows/build.js` の `errors.push` の `duplicate test id` 検査（1 つの Plan の内側だけを見る重複検査で、他 issue の Plan とは突き合わせない）
- `skills/think/references/id-numbering.md`（T-NNN は「plan 全体」で一意と定めるが、この「plan」は 1 issue 分を指し、issue を跨いだ一意性は範囲外）

## 根拠

- #630 「本計画の T-NNN は T-196〜T-214。wave 2 の割り当ては #629 T-170〜T-175、#633 T-176〜T-189、#631 T-190〜T-195、本計画がその次」
- #631 「本計画の T-NNN は T-190〜T-195。#629 が T-170〜T-175、#633 が T-176〜T-189 を持つ」
- #634 「本計画の T-NNN は T-236〜T-248。#629 が T-170〜175、#633 T-176〜189、#631 T-190〜195、#630 T-196〜214、#632 T-215〜235 を予約済み」
