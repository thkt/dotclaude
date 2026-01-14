---
name: documenting-apis
description: コードベースからAPI仕様を生成 - エンドポイント、型、スキーマ。
allowed-tools: [Read, Write, Grep, Glob, Bash, Task]
context: fork
user-invocable: false
---

# API仕様生成

コードベース分析からAPIドキュメントを自動生成。

## 検出項目

| カテゴリ       | 対象                               |
| -------------- | ---------------------------------- |
| エンドポイント | Express, Fastify, Next.js, Flask等 |
| 関数           | tree-sitter, TypeScript, JSDoc     |
| 型             | interface, type, Zod, Pydantic     |
| OpenAPI        | openapi.yaml, swagger.yaml         |
| ベースURL      | 環境設定、定数                     |
| 認証           | Authミドルウェア、JWT、OAuth       |
| エラー形式     | エラーハンドラ、フォーマッタ       |

## 検出パターン

| フレームワーク | パターン                     |
| -------------- | ---------------------------- |
| Express        | `app.get()`, `router.post()` |
| Next.js        | `app/api/**/route.ts`        |
| Flask          | `@app.route()`               |
| FastAPI        | `@app.get()`, `@app.post()`  |

## 品質基準

| 基準                              | 目標 |
| --------------------------------- | ---- |
| 新メンバーが10分以内にAPI利用可能 | ✓    |
| Request/Responseの例が存在        | ✓    |
| エラーケースが文書化されている    | ✓    |
| 認証要件が明確                    | ✓    |
