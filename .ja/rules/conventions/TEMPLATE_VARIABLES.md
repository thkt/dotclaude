---
paths:
  - ".claude/templates/**"
  - ".claude/commands/**"
---

# テンプレート変数構文

テンプレートとコマンド出力での変数置換構文。

## クイックリファレンス

| パターン | 入力                          | テンプレート      | 出力           |
| -------- | ----------------------------- | ----------------- | -------------- |
| 単純     | `name: MyApp`                 | `{name}`          | `MyApp`        |
| ネスト   | `summary: {total: 8}`         | `{summary.total}` | `8`            |
| 配列     | `items: [{id: 1}, {id: 2}]`   | `{items[].id}`    | `1`, `2`       |
| フィルタ | `list: [{p: high}, {p: low}]` | `{list[p=high]}`  | 最初の一致     |
| 除外     | `list: [{p: high}, {p: low}]` | `{list[p!=high]}` | 一致しない全件 |

## 動作ルール

| ルール               | 説明                                     |
| -------------------- | ---------------------------------------- |
| 空配列               | 何も出力しない                           |
| 存在しないプロパティ | 空文字列を出力                           |
| フィルタ `=`         | 最初の一致のみを返す                     |
| フィルタ `!=`        | 一致しない全件を返す                     |
| 全件取得             | フィルタではなく `{array[].prop}` を使用 |

## 構文パターン

| パターン                          | 説明                     | 例                                       |
| --------------------------------- | ------------------------ | ---------------------------------------- |
| `{field}`                         | 単純フィールド           | `{project_name}`                         |
| `{object.property}`               | ネストプロパティ         | `{summary.total_findings}`               |
| `{array[].property}`              | 配列イテレーション       | `{endpoints[].method}`                   |
| `{array[filter=value].property}`  | フィルタ付き配列（等値） | `{priorities[priority=critical].action}` |
| `{array[filter!=value].property}` | フィルタ付き配列（除外） | `{items[fix_type!=manual].id}`           |

## 使用箇所

| 場所         | ファイル                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| コマンド     | `commands/audit.md`, `commands/docs.md`                                  |
| テンプレート | `templates/docs/*.md`, `templates/adr/*.md`, `templates/audit/output.md` |
|              | `templates/sow/template.md`, `templates/spec/template.md`                |
|              | `templates/issue/*.md`, `templates/research/template.md`                 |
