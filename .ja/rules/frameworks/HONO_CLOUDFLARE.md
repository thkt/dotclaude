---
paths:
  - "**/workers-types/**"
  - "**/wrangler.*"
  - "**/hono/**"
  - "**/drizzle/**"
  - "**/drizzle.config.*"
  - "!**/*.test.*"
  - "!**/*.spec.*"
---

# Hono + Cloudflare Workers + Drizzle

## ランタイム制約

| ルール              | 詳細                                                              |
| ------------------- | ----------------------------------------------------------------- |
| Web Standard のみ   | Node.js API、Bun固有API禁止（本番は workerd）                     |
| ブロッキングI/O禁止 | Workers はシングルスレッド。async/await を必ず使用                |
| Env は Bindings経由 | シークレットやサービスは `c.env` でアクセス。`process.env` は不可 |

## Hono パターン

| パターン         | 規約                                                                     |
| ---------------- | ------------------------------------------------------------------------ |
| App 型定義       | `new Hono<{ Bindings: Bindings }>()` で型付き Bindings                   |
| ルートグループ   | ドメインごとに Hono インスタンス分離、`app.route()` でマウント           |
| 認証ミドルウェア | 保護グループに `clerkMiddleware()`、公開ルートはベースアプリに           |
| Variables        | `Hono<{ Bindings: Bindings; Variables: { ... } }>` + `c.set()`/`c.get()` |
| レスポンス       | 必ず `c.json()`。エラー形式: `{ error: string }`                         |
| エラーハンドラ   | `app.onError()` で構造化JSONログ（message, method, path, stack）         |

## バリデーション

| ルール   | 詳細                                                           |
| -------- | -------------------------------------------------------------- |
| 入力     | `c.req.json()` を try-catch、その後 `schema.safeParse()`       |
| 出力     | Zod schema `.parse()` でレスポンスデータ検証（クライアント側） |
| スキーマ | アプリごとに `validators.ts` ファイルを分離                    |

## Drizzle ORM

| ルール        | 詳細                                                                                  |
| ------------- | ------------------------------------------------------------------------------------- |
| スキーマ配置  | 共有パッケージ（`packages/shared/`）に置き、web と api の両方からインポート           |
| DB ファクトリ | リクエストごとに `createDb(c.env.DB)`（D1）またはコネクションプール（Neon）           |
| インデックス  | スキーマのテーブル定義内で宣言。個別マイグレーションにしない                          |
| 日付          | ISO 8601 テキストで保存。SQLite datetime は使わない                                   |
| ID            | UUID は `text().primaryKey()`、連番は `integer().primaryKey({ autoIncrement: true })` |

## モノレポ構成

```text
apps/web/        # フロントエンド (TanStack, Vite) → Cloudflare Pages
apps/api/        # Hono → Cloudflare Workers
packages/shared/ # Drizzle スキーマ、Zod スキーマ、型定義
```

| ルール           | 詳細                                                              |
| ---------------- | ----------------------------------------------------------------- |
| 共有エクスポート | package.json の `exports` でエントリポイントごとに明示            |
| 型の流れ         | Drizzle schema → Zod schema → API レスポンス型 → フロントエンド型 |
| デプロイ         | `wrangler deploy`（api）、`wrangler pages deploy`（web）          |
