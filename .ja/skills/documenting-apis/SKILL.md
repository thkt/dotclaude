---
name: documenting-apis
description: コードベースからAPI仕様を生成 - エンドポイント、型、スキーマ。
allowed-tools: Read, Write, Grep, Glob, Task
context: fork
user-invocable: false
---

# API仕様生成

## アプローチ: スキーマファースト

スキーマ/型ファイルを信頼できる情報源として読み取る。フィールド抽出に grep を使用しない。

| 優先度 | ソース           | 方法                     |
| ------ | ---------------- | ------------------------ |
| 1      | スキーマファイル | 全文読み取り、解析       |
| 2      | ルート/リポジトリ| 全文読み取り、パス抽出   |
| 3      | Grep             | 発見のみ                 |

## 検出

| カテゴリ       | パターン                             |
| -------------- | ------------------------------------ |
| エンドポイント | Express, Fastify, Next.js, Flask等   |
| 型             | interface, type, Zod, Pydantic       |
| OpenAPI        | openapi.yaml, swagger.yaml           |
| 認証           | Authミドルウェア、JWT、OAuthパターン |

## フレームワークパターン

| フレームワーク | ルートパターン               | スキーマパターン                          |
| -------------- | ---------------------------- | ----------------------------------------- |
| Express        | `app.get()`, `router.post()` | `**/routes/**/*.ts`、importされたスキーマ |
| Next.js        | `app/api/**/route.ts`        | 同ファイルまたはimportされた型            |
| Flask          | `@app.route()`               | `schemas.py`、Pydanticモデル              |
| FastAPI        | `@app.get()`, `@app.post()`  | 同ファイル内 Pydantic `BaseModel`         |
| Repository     | `repository.ts` メソッド     | 同ディレクトリの `schema.ts`              |

## スキーマ読み取り

| ルール           | 詳細                                        |
| ---------------- | ------------------------------------------- |
| 全文読み取り     | grep禁止 — 全体をRead                       |
| 全フィールド記録 | "重要"だけでなく全て                        |
| 必須/オプション  | `?` か `.optional()` = オプション、他は必須 |
| 正確な名前       | 定義通りのフィールド名                      |
| ネスト型         | 名前で参照、別途ドキュメント化              |
| ソース位置       | file:lineを記録                             |

## 信頼度

| エビデンス       | レベル   |
| ---------------- | -------- |
| スキーマ + ルート| verified |
| スキーマのみ     | inferred |
| ルートのみ       | inferred |
| Grepマッチのみ   | unknown  |
