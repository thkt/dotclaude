---
name: documenting-apis
description: >
  コードベースからAPI仕様を生成 - エンドポイント、型、スキーマ。
  APIドキュメント生成、エンドポイントのドキュメント化、または
  API docs, API仕様, OpenAPI, Swagger, REST API, endpoint documentation に言及した時に使用。
allowed-tools: [Read, Write, Grep, Glob, Bash, Task]
context: fork
user-invocable: false
---

# API仕様生成

## 検出

| カテゴリ       | パターン                             |
| -------------- | ------------------------------------ |
| エンドポイント | Express, Fastify, Next.js, Flask等   |
| 関数           | tree-sitter, TypeScript, JSDoc       |
| 型             | interface, type, Zod, Pydantic       |
| OpenAPI        | openapi.yaml, swagger.yaml           |
| 認証           | Authミドルウェア、JWT、OAuthパターン |

## フレームワークパターン

| フレームワーク | パターン                     |
| -------------- | ---------------------------- |
| Express        | `app.get()`, `router.post()` |
| Next.js        | `app/api/**/route.ts`        |
| Flask          | `@app.route()`               |
| FastAPI        | `@app.get()`, `@app.post()`  |
