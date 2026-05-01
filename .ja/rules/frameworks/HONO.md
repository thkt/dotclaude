---
paths:
  - "**/workers-types/**"
  - "**/wrangler.*"
  - "**/hono/**"
  - "**/drizzle/**"
  - "**/drizzle.config.*"
  - "!**/*.test.*"
  - "!**/*.spec.*"
  - "!**/node_modules/**"
---

# Hono

## ランタイム制約

| ルール                | 詳細                                                       |
| --------------------- | ---------------------------------------------------------- |
| Web Standard のみ     | Node.js API 不可、Bun 固有 API 不可 (本番は workerd)       |
| ブロッキング I/O 不可 | Workers はシングルスレッド。async/await のみ使う           |
| Env は Bindings       | secret やサービスは `c.env` 経由。`process.env` は使わない |

## Hono パターン

| パターン         | 規約                                                                     |
| ---------------- | ------------------------------------------------------------------------ |
| App 型           | `new Hono<{ Bindings: Bindings }>()` で型付き Bindings を使う            |
| ルートグループ   | ドメインごとに別 Hono インスタンス。`app.route()` でマウント             |
| 認証ミドルウェア | 保護対象グループに `clerkMiddleware()`。公開ルートは base app に置く     |
| Variables        | `Hono<{ Bindings: Bindings; Variables: { ... } }>` + `c.set()`/`c.get()` |
| Response         | 常に `c.json()`。エラー形状: `{ error: string }`                         |
| Error handler    | `app.onError()` で構造化 JSON ログ (message, method, path, stack)        |

## Validation

| ルール  | 詳細                                                      |
| ------- | --------------------------------------------------------- |
| Input   | `c.req.json()` を try-catch、その後 `schema.safeParse()`  |
| Output  | レスポンスデータに Zod schema `.parse()` (クライアント側) |
| Schemas | アプリごとに専用の `validators.ts`                        |

## Drizzle ORM

| ルール      | 詳細                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------- |
| Schema 配置 | 共有パッケージ (`packages/shared/`) に置き、web と api の両方から import                    |
| DB factory  | リクエストごとに `createDb(c.env.DB)` (D1) または接続プール (Neon)                          |
| Indexes     | スキーマ定義内に定義する。マイグレーションを別にしない                                      |
| Dates       | ISO 8601 テキストで保存する。SQLite datetime は使わない                                     |
| IDs         | UUID は `text().primaryKey()`、シーケンスは `integer().primaryKey({ autoIncrement: true })` |

## Security

- 自由記述 Zod フィールド (検索クエリ、ユーザー入力) に `.max()` を適用する MUST
- Drizzle クエリに `as` / `satisfies` アサーションを直接渡さない MUST NOT
