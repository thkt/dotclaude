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

## Type Safety (Security)

- MUST NOT pass client-supplied `as` / `satisfies` assertions to a DB or other trust boundary
- MUST validate external data with a schema, then use the inferred type

## Secrets

- MUST use `crypto.randomUUID()` / `crypto.randomBytes()` (Node) or `crypto.getRandomValues()` (Web Crypto) for session IDs, tokens, one-time codes
- MUST NOT use `Math.random()` for security-sensitive values
