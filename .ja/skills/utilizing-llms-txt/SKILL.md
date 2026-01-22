---
name: utilizing-llms-txt
description: >
  llms.txt標準を使用したLLM最適化ドキュメント取得。
  外部ドキュメント、APIリファレンス、ライブラリドキュメントを取得する際、
  またはユーザーがドキュメント参照、公式ドキュメント、API docs、library documentationに言及した際に使用。
allowed-tools: [WebFetch, Read]
user-invocable: false
---

# llms.txt ドキュメント取得

## 取得順序

外部ドキュメント取得時：

| Step | Action                     | 200 OK      | 404      |
| ---- | -------------------------- | ----------- | -------- |
| 1    | `{base_url}/llms.txt`      | 使用        | → Step 2 |
| 2    | `{base_url}/llms-full.txt` | 使用        | → Step 3 |
| 3    | `{original_url}`           | 使用 (HTML) | -        |

## llms.txtのパース

| パターン        | 意味           | アクション             |
| --------------- | -------------- | ---------------------- |
| `# Title`       | プロジェクト名 | コンテキスト           |
| `> Blockquote`  | 概要           | コンテキスト           |
| `## Section`    | カテゴリ       | ナビゲート             |
| `- [Link](url)` | ページリンク   | 関連すれば取得         |
| `## Optional`   | 低優先度       | 必要でなければスキップ |

## ベースURL抽出

| 要素   | 値                                              |
| ------ | ----------------------------------------------- |
| Input  | `https://docs.stripe.com/api/checkout/sessions` |
| Output | `https://docs.stripe.com`                       |
| Rule   | `{scheme}://{host}`                             |
