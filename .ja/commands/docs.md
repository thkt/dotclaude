---
description: コードベース分析からドキュメントを生成。ユーザーがドキュメント生成, ドキュメント作って, generate docs, ドキュメント化等に言及した場合に使用。
allowed-tools: Read, Write, Task, AskUserQuestion
model: opus
argument-hint: "[architecture|api|domain|setup]"
---

# /docs - ドキュメント生成

## 入力

`$1`（必須）: `architecture` | `api` | `domain` | `setup`

空の場合、AskUserQuestionで選択。

## 実行

1. アナライザー呼び出し: `architecture-analyzer`, `api-analyzer`, `domain-analyzer`, `setup-analyzer`
2. アナライザーが構造化YAMLを返す
3. YAMLに必須トップレベルキーがあるか検証（エラー → "Analyzer returned invalid YAML" を報告）
4. `architecture` か `api` の場合: `.analysis/{type}.yaml` に保存
5. `templates/docs/{type}.md` からテンプレート読み込み
6. テンプレートでYAMLをフォーマット
7. `.analysis/{type}.md` に保存
8. ユーザーに提示

## フロー

```text
architecture / api:
[analyzer YAML] → .analysis/{type}.yaml (データ)
               → [template] → .analysis/{type}.md (ドキュメント)

domain / setup:
[analyzer YAML] → [template] → .analysis/{type}.md (ドキュメント)
```

## 型別必須キー

| 型           | 必須キー                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| architecture | `project_name`, `tech_stack`, `key_components`, `dependencies`           |
| api          | `project_name`, `meta`, `endpoints`                                      |
| domain       | `project_name`, `generated_at`, `meta`, `confidence_summary`, `entities` |
| setup        | `project_name`, `prerequisites`, `installation`                          |

ステップ3でこのテーブルに基づき検証。キー欠落 → どのキーが不足しているか報告。

## 出力

テンプレートでフォーマットされたMarkdown。変数: `{field}`, `{object.property}`, `{array[].property}`。条件: `{field? (foreach)}...{/foreach}` (optional配列用)
