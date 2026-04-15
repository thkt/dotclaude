# Security

Complements guardrails (static detection). Covers missing validations, absent
authorization checks, and missing middleware — patterns guardrails cannot detect.

## Input

| Rule | Detail |
| ---- | ------ |
| MUST | Validate all API endpoint inputs with Zod schemas (client and server) |
| MUST | Apply `.max()` length limits to search queries and free-text fields |
| MUST NOT | Pass client-supplied type assertions (`as`, `satisfies`) directly to the DB |

## Access Control

| Rule | Detail |
| ---- | ------ |
| MUST | Verify ownership on resource access (`resource.userId === currentUser.id`) |
| MUST NOT | Use only a numeric ID from URL params or body for access control (IDOR) |
| MUST | Mount auth middleware on route groups, not per-endpoint checks (gaps are inevitable) |
| MUST NOT | Reveal resource existence to unauthenticated users (prefer 404 over 403) |
| MUST | Apply rate limiting to auth endpoints (login, register, password-reset) |
| MUST | Apply request limits to endpoints that trigger external API calls |

## Secrets

| Rule | Detail |
| ---- | ------ |
| MUST | Throw an error when a required env var is missing — never fall back to a hardcoded value |
| MUST | Use `crypto.randomBytes()` or `crypto.randomUUID()` for session IDs, tokens, and one-time codes (`Math.random()` is not cryptographically secure) |

## Output

| Rule | Detail |
| ---- | ------ |
| MUST NOT | Include stack traces, internal paths, or DB details in responses (return a generic message; log details server-side only) |
| MUST NOT | Distinguish auth failure reasons (e.g. "wrong password" vs "email not found") |
