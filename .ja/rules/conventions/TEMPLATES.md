---
paths:
  - ".claude/skills/**/templates/**"
---

# Template Variables

テンプレートおよびコマンド出力のための変数置換構文。

## 構文

| パターン                          | 入力                          | 出力         | 説明            |
| --------------------------------- | ----------------------------- | ------------ | --------------- |
| `{field}`                         | `name: MyApp`                 | `MyApp`      | 単純フィールド  |
| `{object.property}`               | `summary: {total: 8}`         | `8`          | ネスト          |
| `{array[].property}`              | `items: [{id: 1}, {id: 2}]`   | `1`, `2`     | 配列反復        |
| `{array[filter=value].property}`  | `list: [{p: high}, {p: low}]` | 最初のマッチ | フィルタ (一致) |
| `{array[filter!=value].property}` | `list: [{p: high}, {p: low}]` | 全非マッチ   | フィルタ (除外) |

## エッジケース

| 入力           | 出力                   |
| -------------- | ---------------------- |
| 空配列         | 何もレンダリングしない |
| 欠落プロパティ | 空文字列をレンダリング |
