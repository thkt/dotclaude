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

## 型安全（セキュリティ）

- MUST NOT クライアントから受け取った `as` / `satisfies` を DB や信頼境界にそのまま渡さない
- MUST 外部データはスキーマで検証してから推論された型を使う

## シークレット

- MUST セッションID・トークン・ワンタイムコードには `crypto.randomUUID()` / `crypto.randomBytes()`（Node）または `crypto.getRandomValues()`（Web Crypto）を使う
- MUST NOT セキュリティ用途で `Math.random()` を使わない
