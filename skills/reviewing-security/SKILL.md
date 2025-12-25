---
name: reviewing-security
description: >
  OWASP Top 10-based security review and vulnerability detection. Triggers:
  セキュリティ, 脆弱性, XSS, SQL injection, SQLインジェクション, CSRF,
  認証, 認可, 暗号化, OWASP, SSRF, パスワード, セッション, rate limiting,
  brute force, command injection, security misconfiguration.
allowed-tools: Read, Grep, Glob, Task
---

# Security Review - OWASP Top 10 Based

OWASP Top 10-based vulnerability detection and secure implementation guidance.

## Section-Based Loading

| Section | File | Focus | Triggers |
| --- | --- | --- | --- |
| Basic Security | `references/owasp-basic.md` | OWASP 1,2,7: Access Control, Crypto, Auth | auth, password, session |
| Injection | `references/owasp-injection.md` | OWASP 3: SQL/NoSQL/Command, XSS, CSRF | injection, XSS, CSRF |
| Advanced | `references/owasp-advanced.md` | OWASP 4-6,8-10: Design, Config, Monitoring, SSRF | rate limiting, SSRF, logging |

## Security Review Checklist

### Step 1: Input Validation

- [ ] All user input is sanitized
- [ ] SQL queries use parameterized statements
- [ ] User input not directly used in command execution
- [ ] XSS protection (escaping) applied

### Step 2: Authentication & Authorization

- [ ] Passwords properly hashed (bcrypt recommended)
- [ ] Secure session management (HttpOnly, Secure, SameSite)
- [ ] JWT expiration properly configured
- [ ] Authorization checks on all endpoints

### Step 3: Data Protection

- [ ] Sensitive data not logged
- [ ] HTTPS enforced
- [ ] API keys not hardcoded

### Step 4: Error Handling

- [ ] Detailed error messages hidden in production
- [ ] Stack traces not exposed to users

### Step 5: Dependencies

```bash
npm audit  # or yarn audit
```

- [ ] No known vulnerabilities

## Key Principles

| Principle | Description |
| --- | --- |
| Defense in Depth | Don't rely on single measure |
| Least Privilege | Minimal permissions |
| Fail Securely | Safe even when failing |
| Security by Default | Secure by default |

## References

- [@./references/owasp-basic.md](./references/owasp-basic.md) - Access Control, Crypto, Auth
- [@./references/owasp-injection.md](./references/owasp-injection.md) - SQL/XSS/CSRF
- [@./references/owasp-advanced.md](./references/owasp-advanced.md) - Design, Config, Monitoring
