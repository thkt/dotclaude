# Security

Complements guardrails (static detection). Covers missing validations, absent authorization checks, and missing middleware.

## Input

- MUST validate all API endpoint inputs with a schema, on client and server
- MUST apply length limits to search queries and free-text fields
- MUST NOT pass client-supplied type information directly to the DB or other trust boundaries

## Access Control

- MUST verify ownership on resource access (requester owns the target)
- MUST NOT use only a numeric ID from URL params or body for access control (IDOR risk)
- MUST mount auth middleware on route groups, not per-endpoint checks
- MUST NOT reveal resource existence to unauthenticated users (prefer 404 over 403)
- MUST apply rate limiting to auth endpoints (login, register, password-reset)
- MUST apply request limits to endpoints that trigger external API calls

## Secrets

- MUST throw an error when a required env var is missing. Do not fall back to a hardcoded value
- MUST use a cryptographically secure random source for session IDs, tokens, and one-time codes

## Output

- MUST NOT include stack traces, internal paths, or DB details in responses. Return a generic message; log details server-side only
- MUST NOT distinguish auth failure reasons (for example, "wrong password" vs "email not found")
