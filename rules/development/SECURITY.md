# Security

Complements guardrails (static detection). Covers missing validations, absent authorization checks, and missing middleware.

## Input

- MUST validate all API endpoint inputs with a schema, on client and server
- MUST apply length limits to search queries and free-text fields
- MUST NOT pass client-supplied type information directly to the DB or other trust boundaries
- MUST validate `Content-Length` and reject `NaN` to prevent payload-size bypass
- MUST validate redirect targets such as `returnUrl` against a host allowlist; reject `javascript:` and `data:` schemes
- MUST NOT build request objects with `...body` spread; assign explicit fields to prevent prototype pollution

## Access Control

- MUST verify ownership on resource access (requester owns the target)
- MUST NOT use only a numeric ID from URL params or body for access control (IDOR risk)
- MUST mount auth middleware on route groups, not per-endpoint checks
- MUST NOT reveal resource existence to unauthenticated users (prefer 404 over 403)
- MUST apply rate limiting to auth endpoints (login, register, password-reset)
- MUST apply request limits to endpoints that trigger external API calls
- MUST verify CSRF tokens on state-changing requests (POST/PUT/PATCH/DELETE) using Double Submit Cookie

## Secrets

- MUST throw an error when a required env var is missing. Do not fall back to a hardcoded value
- MUST use a cryptographically secure random source for session IDs, tokens, and one-time codes
- MUST use constant-time comparison for tokens and signatures (XOR all bytes, decide last); never use `===`
- MUST verify webhook signatures with HMAC-SHA256 plus constant-time comparison

## Outbound Requests

- MUST validate webhook destination URLs against a host allowlist; reject private IP ranges (127.0.0.0/8, 10.0.0.0/8, etc.) to prevent SSRF

## Output

- MUST NOT include stack traces, internal paths, or DB details in responses. Return a generic message; log details server-side only
- MUST NOT distinguish auth failure reasons (for example, "wrong password" vs "email not found")
- MUST set CSP, `X-Frame-Options: DENY`, HSTS (`max-age=63072000`), `X-Content-Type-Options: nosniff`, and `Permissions-Policy` from middleware
- MUST NOT set `Access-Control-Allow-Origin: *`; specify allowed origins explicitly
