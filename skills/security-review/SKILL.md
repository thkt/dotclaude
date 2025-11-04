---
name: security-review
description: >
  OWASP Top 10-based security review and vulnerability detection skill with section-based content.
  Triggers on keywords: "セキュリティ", "security", "脆弱性", "vulnerability", "XSS", "SQLインジェクション",
  "SQL injection", "CSRF", "認証", "authentication", "認可", "authorization", "暗号化", "encryption",
  "安全性", "safety", "セキュアコーディング", "secure coding", "injection", "access control".
  Auto-activates during code implementation or review to detect common vulnerability patterns
  and suggest secure implementations based on OWASP Top 10.
version: 2.0.0
triggers:
  keywords:
    - セキュリティ
    - security
    - 脆弱性
    - vulnerability
    - XSS
    - Cross-Site Scripting
    - SQLインジェクション
    - SQL injection
    - CSRF
    - Cross-Site Request Forgery
    - 認証
    - authentication
    - 認可
    - authorization
    - 暗号化
    - encryption
    - 安全性
    - safety
    - secure
    - セキュアコーディング
    - secure coding
    - injection
    - access control
    - OWASP
    - SSRF
    - password
    - パスワード
    - token
    - session
    - セッション
    - rate limiting
    - brute force
    - ブルートフォース
  patterns:
    - "セキュリティ.*チェック"
    - "security.*check"
    - "脆弱性.*検出"
    - "vulnerability.*scan"
    - "安全.*実装"
    - "secure.*implementation"
sections:
  - id: owasp-basic
    file: sections/owasp-basic.md
    triggers: [Access Control, Broken Access Control, 認証, authentication, 認可, authorization, 暗号化, encryption, Cryptographic Failures, password, パスワード, session, セッション]
    tokens: ~900
    description: OWASP 1, 2, 7 - Access Control, Cryptography, Authentication

  - id: owasp-injection
    file: sections/owasp-injection.md
    triggers: [injection, SQL injection, SQLインジェクション, XSS, Cross-Site Scripting, CSRF, Command Injection, NoSQL injection]
    tokens: ~600
    description: OWASP 3 + XSS/CSRF - All injection attacks

  - id: owasp-advanced
    file: sections/owasp-advanced.md
    triggers: [rate limiting, brute force, ブルートフォース, SSRF, Server-Side Request Forgery, Security Misconfiguration, logging, monitoring, dependencies, 脆弱性スキャン]
    tokens: ~800
    description: OWASP 4-6, 8-10 - Design, Configuration, Monitoring, SSRF
context_size: ~200 tokens (metadata only)
full_size: ~2500 tokens (all sections loaded)
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
---

# Security Review - OWASP Top 10 Based Code Analysis

## 🎯 Core Philosophy

**"Security is not a feature, it's a foundation"**

Security should be built into the design from the start, not added afterward.

### What This Skill Provides

1. **OWASP Top 10-Based Checklist** - Industry-standard vulnerability patterns
2. **Practical Detection Patterns** - Identify dangerous patterns in code
3. **Secure Implementation Examples** - Specific methods to fix vulnerabilities
4. **Defensive Coding** - Design assuming attacks will happen

---

## 📚 Section-Based Content

This skill is organized into 3 specialized sections for efficient context usage:

### 🔒 Section 1: OWASP Basic Security

**File**: [`sections/owasp-basic.md`](./sections/owasp-basic.md)
**Tokens**: ~900
**Focus**: Access Control (OWASP 1), Cryptographic Failures (OWASP 2), Authentication Failures (OWASP 7)

**Triggers**: Access Control, Broken Access Control, 認証, authentication, 認可, authorization, 暗号化, encryption, password, パスワード, session, セッション

**Coverage**:
- Broken Access Control - Authorization and ownership checks
- Cryptographic Failures - Password hashing, encryption, HTTPS
- Authentication Failures - Session management, JWT, refresh tokens

---

### 💉 Section 2: OWASP Injection Attacks

**File**: [`sections/owasp-injection.md`](./sections/owasp-injection.md)
**Tokens**: ~600
**Focus**: Injection (OWASP 3) - SQL, NoSQL, Command + XSS/CSRF Prevention

**Triggers**: injection, SQL injection, SQLインジェクション, XSS, Cross-Site Scripting, CSRF, Command Injection, NoSQL injection

**Coverage**:
- SQL Injection - Parameterized queries, ORM usage
- NoSQL Injection - Input sanitization for MongoDB
- Command Injection - Avoid shell execution with user input
- XSS Prevention - React escaping, DOMPurify
- CSRF Prevention - CSRF tokens, SameSite cookies

---

### 🛡️ Section 3: OWASP Advanced Security

**File**: [`sections/owasp-advanced.md`](./sections/owasp-advanced.md)
**Tokens**: ~800
**Focus**: Design (OWASP 4-6), Monitoring (OWASP 8-10), SSRF

**Triggers**: rate limiting, brute force, ブルートフォース, SSRF, Server-Side Request Forgery, Security Misconfiguration, logging, monitoring, dependencies

**Coverage**:
- Insecure Design - Rate limiting, account lockout, fail-safe design
- Security Misconfiguration - Debug mode, CORS, security headers
- Vulnerable Components - npm audit, dependency management
- Software Integrity Failures - Subresource Integrity (SRI)
- Logging & Monitoring Failures - Security event logging
- SSRF - URL validation, private IP blocking
- Security Review Checklist - Comprehensive review checklist

---

## 💡 Practical Application

### Auto-Trigger Example

```markdown
User: "Implement user registration API"

Security Review Skill triggers →

"From a security perspective, let's ensure:

1. Password hashing (using bcrypt)
2. Rate limiting (brute force protection)
3. Input validation (SQL injection protection)
4. HTTPS communication
5. CSRF token

I'll provide implementation examples..."
```

### Common Scenarios

1. **Implementing login functionality**
   - Suggest password hashing
   - Add rate limiting
   - Secure session management

2. **Creating APIs**
   - Verify authentication/authorization checks
   - Add input validation
   - Configure rate limiting

3. **Database operations**
   - Verify SQL injection protection
   - Recommend parameterized queries

4. **Implementing forms**
   - Add CSRF protection
   - Verify XSS protection

---

## ✨ Key Takeaways

1. **Defense in Depth** - Don't rely on a single measure
2. **Principle of Least Privilege** - Minimal permissions
3. **Fail Securely** - Safe even when failing
4. **Security by Default** - Secure by default

---

**Remember**: "Security is not about being perfect, it's about making it harder for attackers"
