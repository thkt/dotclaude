---
name: documenting-apis
description: >
  コードベース分析からAPI仕様ドキュメントを生成。
  RESTエンドポイント、関数シグネチャ、型定義、スキーマを検出。
  トリガー: API specification, endpoints, REST API, type definitions,
  OpenAPI, Swagger, API documentation.
allowed-tools: Read, Write, Grep, Glob, Bash, Task
---

# docs:api - API仕様生成

コードベース分析からAPIドキュメントを自動生成。

## 検出項目

| カテゴリ | 対象 |
| --- | --- |
| RESTエンドポイント | Express, Fastify, Hono, Next.js, Flask, FastAPI, Django REST |
| 関数 | tree-sitter抽出、TypeScript型、JSDoc、docstrings |
| 型 | interface, type, Zod, Yup, dataclass, Pydantic |
| OpenAPI | openapi.yaml/json, swagger.yaml/json |

## フレームワーク検出パターン

| フレームワーク | パターン |
| --- | --- |
| Express/Fastify/Hono | `app.get()`, `router.post()` |
| Next.js | `app/api/**/route.ts`, `pages/api/**/*.ts` |
| Flask | `@app.route()` |
| FastAPI | `@app.get()`, `@app.post()` |
| Django REST | `@api_view` |

## 分析スクリプト

| スクリプト | 目的 |
| --- | --- |
| `scripts/detect-endpoints.sh` | HTTPメソッド、パス、ハンドラー、ファイル位置 |
| `scripts/extract-types.sh` | 型名、フィールド、関連型 |

## 生成構造

```markdown
# API仕様

## エンドポイント一覧
### GET /api/users
**リクエスト**: paramsテーブル
**レスポンス**: JSON例

## 型定義
### User
| フィールド | 型 | 説明 |
```

## 使用方法

```bash
/docs:api                    # APIドキュメント生成
"Generate API specification" # 自然言語
```

## Markdownバリデーション

生成後、出力を検証:

```bash
~/.claude/skills/scripts/validate-markdown.sh {output-file}
```

ブロッキングなし（警告のみ） - スタイル問題はドキュメント作成をブロックしない。

## 参照

- 関連: `documenting-architecture`, `setting-up-docs`, `documenting-domains`
