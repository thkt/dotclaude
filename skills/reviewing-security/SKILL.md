---
name: reviewing-security
description: >
  OWASP Top 10-based security review and vulnerability detection. Use when
  reviewing code for security issues, performing vulnerability analysis, or when
  user mentions security, OWASP, XSS, SQL injection, セキュリティ, 脆弱性, cloud
  security, AWS, IAM, Terraform, クラウドセキュリティ, インフラ.
allowed-tools: [Read, Grep, Glob, Task]
agent: security-reviewer
context: fork
user-invocable: false
---

# Security Review

## Detection (OWASP Top 10)

| ID  | Category                  | Pattern                                                  | Fix                                  |
| --- | ------------------------- | -------------------------------------------------------- | ------------------------------------ |
| A01 | Broken Access Control     | Missing auth, IDOR, path traversal                       | Auth middleware, ownership check     |
| A02 | Cryptographic Failures    | `password: 'plaintext'`                                  | bcrypt/argon2 hashing                |
| A03 | Injection                 | `db.query(\`SELECT...${id}\`)`                           | Parameterized query, ORM             |
| A03 | Injection                 | `exec(\`ping ${host}\`)`                                 | Input validation, library instead    |
| A03 | XSS                       | `dangerouslySetInnerHTML` (static presence)              | Default escaping, DOMPurify          |
| A05 | Security Misconfiguration | `cors({ origin: '*' })`                                  | Explicit origin allowlist            |
| A05 | Security Misconfiguration | `cookie: {}` (no options)                                | secure, httpOnly, sameSite: 'strict' |
| A09 | Logging Failures          | `logger.info({ password })`                              | Exclude sensitive fields             |
| A10 | SSRF                      | `fetch(userInputUrl)`                                    | URL validation, allowlist            |
| A03 | XSS (Taint)               | `dangerouslySetInnerHTML={{ __html }}` without sanitizer | DOMPurify.sanitize() at boundary     |
| A03 | XSS (Taint)               | Function arg → `innerHTML` without sanitization          | Sanitize at function boundary        |
| A03 | XSS (Taint)               | `<a href={variable}>` with user-controlled URL           | Protocol allowlist (https/http only) |
| A01 | Open Redirect (Taint)     | URL param → `location.href` without validation           | Domain allowlist or relative-only    |
| A04 | Insecure Design           | `postMessage` handler without origin check               | Strict `event.origin` comparison     |
| A02 | Sensitive Data Exposure   | JWT stored in localStorage/sessionStorage                | httpOnly cookie instead              |

## Confidence Threshold

Report findings with confidence >=0.60. For 0.60-0.80: include
verification_hint. For >=0.80: include full exploit scenario and fix
recommendation. Always include file:line.

## References

| Topic     | Scope            | File                                                         |
| --------- | ---------------- | ------------------------------------------------------------ |
| Basic     | A01, A02, A07    | `${CLAUDE_SKILL_DIR}/references/owasp-basic.md`              |
| Injection | A03              | `${CLAUDE_SKILL_DIR}/references/owasp-injection.md`          |
| Advanced  | A04-A06, A08-A10 | `${CLAUDE_SKILL_DIR}/references/owasp-advanced.md`           |
| Cloud     | IAM, IaC, CI/CD  | `${CLAUDE_SKILL_DIR}/references/cloud-infrastructure.md`     |
| Frontend  | Taint analysis   | `${CLAUDE_SKILL_DIR}/references/frontend-taint-checklist.md` |
