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

## Runtime Constraints

| Rule              | Detail                                                           |
| ----------------- | ---------------------------------------------------------------- |
| Web Standard only | No Node.js APIs, no Bun-specific APIs (production is workerd)    |
| No blocking I/O   | Workers are single-threaded; use async/await exclusively         |
| Env via Bindings  | Access secrets and services through `c.env`, never `process.env` |

## Hono Patterns

| Pattern         | Convention                                                               |
| --------------- | ------------------------------------------------------------------------ |
| App type        | `new Hono<{ Bindings: Bindings }>()` with typed Bindings                 |
| Route grouping  | Separate Hono instance per domain, mount via `app.route()`               |
| Auth middleware | `clerkMiddleware()` on protected group, public routes on base app        |
| Variables       | `Hono<{ Bindings: Bindings; Variables: { ... } }>` + `c.set()`/`c.get()` |
| Response        | Always `c.json()`. Error shape: `{ error: string }`                      |
| Error handler   | `app.onError()` with structured JSON log (message, method, path, stack)  |

## Validation

| Rule    | Detail                                                 |
| ------- | ------------------------------------------------------ |
| Input   | `c.req.json()` in try-catch, then `schema.safeParse()` |
| Output  | Zod schema `.parse()` on response data (client-side)   |
| Schemas | Dedicated `validators.ts` file per app                 |

## Drizzle ORM

| Rule            | Detail                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Schema location | Shared package (`packages/shared/`), imported by both web and api                              |
| DB factory      | `createDb(c.env.DB)` per request (D1) or connection pool (Neon)                                |
| Indexes         | Define in schema table definition, not as separate migrations                                  |
| Dates           | Store as ISO 8601 text, not SQLite datetime                                                    |
| IDs             | `text().primaryKey()` for UUIDs, `integer().primaryKey({ autoIncrement: true })` for sequences |

## Monorepo Structure

```text
apps/web/        # Frontend (TanStack, Vite) → Cloudflare Pages
apps/api/        # Hono → Cloudflare Workers
packages/shared/ # Drizzle schema, Zod schemas, types
```

| Rule           | Detail                                                            |
| -------------- | ----------------------------------------------------------------- |
| Shared exports | Explicit `exports` field in package.json per entry point          |
| Type flow      | Drizzle schema → Zod schema → API response types → Frontend types |
| Deploy         | `wrangler deploy` (api), `wrangler pages deploy` (web)            |
