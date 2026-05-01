---
paths:
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
  - "**/*.ts"
  - "**/*.tsx"
  - "!**/*.test.*"
  - "!**/*.spec.*"
---

# JavaScript / TypeScript

## 型安全 (Security)

- クライアント由来の `as` / `satisfies` アサーションを DB やその他の信頼境界へ渡さない MUST NOT
- 外部データはスキーマで検証し、推論された型を使う MUST

## Secrets

- セッション ID、トークン、ワンタイムコードには `crypto.randomUUID()` / `crypto.randomBytes()` (Node) または `crypto.getRandomValues()` (Web Crypto) を使う MUST
- セキュリティ感度のある値に `Math.random()` を使わない MUST NOT
