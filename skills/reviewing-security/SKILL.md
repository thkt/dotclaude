---
name: reviewing-security
description: >
  OWASP Top 10-based security review and vulnerability detection.
  Use when reviewing code for security issues, performing vulnerability analysis,
  or when user mentions security, OWASP, XSS, SQL injection, セキュリティ, 脆弱性,
  cloud security, AWS, IAM, Terraform, クラウドセキュリティ, インフラ.
allowed-tools: [Read, Grep, Glob, Task]
agent: security-reviewer
context: fork
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

| Topic     | Scope            | File                                 |
| --------- | ---------------- | ------------------------------------ |
| Basic     | A01, A02, A07    | `references/owasp-basic.md`          |
| Injection | A03              | `references/owasp-injection.md`      |
| Advanced  | A04-A06, A08-A10 | `references/owasp-advanced.md`       |
| Cloud     | IAM, IaC, CI/CD  | `references/cloud-infrastructure.md` |
