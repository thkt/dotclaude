---
name: reviewing-security
description: OWASP Top 10-based security review and vulnerability detection.
allowed-tools: [Read, Grep, Glob, Task]
agent: security-reviewer
user-invocable: false
---

# Security Review - OWASP Top 10

OWASP-based vulnerability detection and secure implementation guidance.

## Section-Based Loading

| Section        | File                            | Focus                        |
| -------------- | ------------------------------- | ---------------------------- |
| Basic Security | `references/owasp-basic.md`     | Access Control, Crypto, Auth |
| Injection      | `references/owasp-injection.md` | SQL/XSS/CSRF                 |
| Advanced       | `references/owasp-advanced.md`  | Design, Config, SSRF         |

## Quick Checklist

### Input Validation

- [ ] All user input sanitized
- [ ] SQL uses parameterized statements
- [ ] No command injection
- [ ] XSS protection applied

### Auth & Session

- [ ] Passwords hashed (bcrypt)
- [ ] HttpOnly, Secure, SameSite cookies
- [ ] JWT expiration configured
- [ ] Authorization on all endpoints

### Data Protection

- [ ] Sensitive data not logged
- [ ] HTTPS enforced
- [ ] API keys not hardcoded

### Dependencies

- [ ] `npm audit` / `yarn audit` clean

## Key Principles

| Principle        | Description                  |
| ---------------- | ---------------------------- |
| Defense in Depth | Don't rely on single measure |
| Least Privilege  | Minimal permissions          |
| Fail Securely    | Safe even when failing       |
| Security Default | Secure by default            |
