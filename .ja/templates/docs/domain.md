# ドメインテンプレート

## 構造

```markdown
# {project_name} - ドメインドキュメント

> Generated: {generated_at} | Framework: {meta.framework} | ORM: {meta.orm} | Confidence: {confidence_summary.verified} verified, {confidence_summary.inferred} inferred, {confidence_summary.unknown} unknown

## 用語集

| 用語              | 定義                    | コンテキスト         | ソース                   |
| ----------------- | ----------------------- | -------------------- | ------------------------ |
| {glossary[].term} | {glossary[].definition} | {glossary[].context} | {glossary[].source_file} |

## エンティティ

### {entities[].name} [{entities[].confidence}]

> Source: {entities[].source_file}
> Directory: {entities[].directory_name} _(エンティティ名と異なる場合)_

| フィールド                 | 型                         | Nullable                       | 説明                              | ソース                            |
| -------------------------- | -------------------------- | ------------------------------ | --------------------------------- | --------------------------------- |
| {entities[].fields[].name} | {entities[].fields[].type} | {entities[].fields[].nullable} | {entities[].fields[].description} | {entities[].fields[].source_file} |

**不変条件**:

- {entities[].invariants[].rule} (`{entities[].invariants[].source_file}`)

**ポリモーフィック** _(該当する場合)_:

Discriminator: `{entities[].polymorphic.discriminator}`

| 型値                                           | 名前                                     | 固有フィールド                                                   | ソース                                          |
| ---------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| {entities[].polymorphic.variants[].type_value} | {entities[].polymorphic.variants[].name} | {entities[].polymorphic.variants[].unique_fields[].name}: {type} | {entities[].polymorphic.variants[].source_file} |

## 値オブジェクト

### {value_objects[].name} [{value_objects[].confidence}]

> Source: {value_objects[].source_file} | Used by: {value_objects[].used_by}

| フィールド                      | 型                              | Nullable                            | ソース                                 |
| ------------------------------- | ------------------------------- | ----------------------------------- | -------------------------------------- |
| {value_objects[].fields[].name} | {value_objects[].fields[].type} | {value_objects[].fields[].nullable} | {value_objects[].fields[].source_file} |

## リレーションシップ

\`\`\`mermaid
{relationships.mermaid}
\`\`\`

| From                           | To                           | Type                           | Path                           | Source                                |
| ------------------------------ | ---------------------------- | ------------------------------ | ------------------------------ | ------------------------------------- |
| {relationships.details[].from} | {relationships.details[].to} | {relationships.details[].type} | {relationships.details[].path} | {relationships.details[].source_file} |

## ビジネスルール

| ルール                  | 説明                           | 適用箇所                       | ソース                         |
| ----------------------- | ------------------------------ | ------------------------------ | ------------------------------ |
| {business_rules[].name} | {business_rules[].description} | {business_rules[].enforced_by} | {business_rules[].source_file} |

## ドメインイベント

| イベント               | トリガー                  | サブスクライバー              | ソース                        |
| ---------------------- | ------------------------- | ----------------------------- | ----------------------------- |
| {domain_events[].name} | {domain_events[].trigger} | {domain_events[].subscribers} | {domain_events[].source_file} |

## コード課題

| 場所                     | 重要度                    | 説明                         |
| ------------------------ | ------------------------- | ---------------------------- |
| {code_issues[].location} | {code_issues[].severity}  | {code_issues[].description}  |
```
