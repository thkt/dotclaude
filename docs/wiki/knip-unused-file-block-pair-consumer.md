---
globs: ["**/*.ts"]
scenes: ["plan", "implement"]
---

# 新規 helper は同じ unit で import する側と組にする

## 内容

import する側を持たない新しい `.ts` helper を書くと、knip を含む gates hook が unused file としてその書き込みをブロックする。同じ unit の中でテストや呼び出し元など import する側を続けて書けば解消する。import する側を持たない CLI 入口 (path 起動される script) だけは、knip.json の `entry` に足して unused 判定から外す。

## 定型手順

1. 新しい helper (import される側) を書く前に、同じ unit の中に import する側 (テストまたは呼び出し元) を用意できるか確認する
2. 用意できるなら、helper を書いた直後の gates hook のブロックは想定内として、続けて import する側を書く
3. 誰も import しない CLI 入口 (path 起動される script) は `knip.json` の `entry` に追加する

## 参照コード

- `knip.json` の `entry`（import する側が無い CLI 入口だけを列挙し、unused file 判定から除外する）
- `hooks/lifecycle/recall_index.ts`（entry に載る側の実例。誰も import しない CLI 入口）

## 根拠

- #630 「helper を最初に書いた瞬間の gates hook の block は想定内で、次に書く import 側がそれを解消する」
- #634 「新しい helper は同じ unit の中で import する側を持つ。knip の gates hook が unused file で書き込みを止めるため...helper を最初に書いた瞬間の gates hook の block は想定内で、次に書く import 側がそれを解消する」
