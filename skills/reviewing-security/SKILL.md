---
name: reviewing-security
description: OWASP Top 10-based security review and vulnerability detection.
allowed-tools: [Read, Grep, Glob, Task]
agent: security-reviewer
user-invocable: false
---

# Security Review

## Detection (OWASP Top 10)

| ID  | Category                  | Pattern                                | Fix                                  |
| --- | ------------------------- | -------------------------------------- | ------------------------------------ |
| A01 | Broken Access Control     | Missing auth, IDOR, path traversal     | Auth middleware, ownership check     |
| A02 | Cryptographic Failures    | `password: 'plaintext'`                | bcrypt/argon2 hashing                |
| A03 | Injection                 | `db.query(\`SELECT...${id}\`)`         | Parameterized query, ORM             |
| A03 | Injection                 | `exec(\`ping ${host}\`)`               | Input validation, library instead    |
| A03 | XSS                       | `dangerouslySetInnerHTML={{ __html }}` | Default escaping, DOMPurify          |
| A05 | Security Misconfiguration | `cors({ origin: '*' })`                | Explicit origin allowlist            |
| A05 | Security Misconfiguration | `cookie: {}` (no options)              | secure, httpOnly, sameSite: 'strict' |
| A09 | Logging Failures          | `logger.info({ password })`            | Exclude sensitive fields             |
| A10 | SSRF                      | `fetch(userInputUrl)`                  | URL validation, allowlist            |

## Confidence Threshold

Report only when confidence >80%. Include: file:line, exploit scenario, fix recommendation.

## References

| Topic          | File                            |
| -------------- | ------------------------------- |
| Basic Security | `references/owasp-basic.md`     |
| Injection      | `references/owasp-injection.md` |
| Advanced       | `references/owasp-advanced.md`  |
