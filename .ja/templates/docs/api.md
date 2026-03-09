# API テンプレート

## 構造

```markdown
# {project_name} - API 仕様

> Generated: {generated_at} | Framework: {meta.framework} | Confidence: {confidence_summary.verified} verified, {confidence_summary.inferred} inferred, {confidence_summary.unknown} unknown

## メタ情報

| プロパティ   | 値                  |
| ------------ | ------------------- |
| Base URL     | `{base_url}`        |
| Content-Type | {meta.content_type} |
| Date Format  | {meta.date_format}  |

## 認証

| メソッド                  | ヘッダー                  | 説明                           |
| ------------------------- | ------------------------- | ------------------------------ |
| {authentication[].method} | {authentication[].header} | {authentication[].description} |

## エンドポイント

### {endpoints[].resource}

#### {endpoints[].method} {endpoints[].path} [{endpoints[].confidence}]

**説明**: {endpoints[].description}

**リクエスト** ({endpoints[].request.content_type}):

| フィールド                          | 型                                  | 必須                                    |
| ----------------------------------- | ----------------------------------- | --------------------------------------- |
| {endpoints[].request.fields[].name} | {endpoints[].request.fields[].type} | {endpoints[].request.fields[].required} |

**レスポンス**:

| フィールド                           | 型                                   |
| ------------------------------------ | ------------------------------------ |
| {endpoints[].response.fields[].name} | {endpoints[].response.fields[].type} |

**ステータスコード**:

| コード                            | 説明                                     |
| --------------------------------- | ---------------------------------------- |
| {endpoints[].status_codes[].code} | {endpoints[].status_codes[].description} |

## エラーフォーマット

\`\`\`json
{error_format.structure}
\`\`\`

## 型定義

| 型             | ソース                | フィールド       | 説明                  |
| -------------- | --------------------- | ---------------- | --------------------- |
| {types[].name} | {types[].source_file} | {types[].fields} | {types[].description} |
```
