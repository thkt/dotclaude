---
name: reviewing-security
description: >
  OWASP Top 10-based security review and vulnerability detection. Use when reviewing security
  (セキュリティ), vulnerabilities (脆弱性), XSS, Cross-Site Scripting, SQL injection
  (SQLインジェクション), CSRF, authentication (認証), authorization (認可), encryption
  (暗号化), secure coding (セキュアコーディング), access control, OWASP, SSRF,
  passwords (パスワード), tokens, sessions (セッション), rate limiting, brute force
  (ブルートフォース), broken access control, cryptographic failures, command injection,
  NoSQL injection, security misconfiguration, logging, monitoring, or dependency vulnerabilities
  (脆弱性スキャン). Detects common vulnerability patterns and suggests secure implementations
  based on OWASP Top 10. Essential for security-focused code reviews.
allowed-tools: Read, Grep, Glob, Task
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

**File**: [`references/owasp-basic.md`](./references/owasp-basic.md)
**Tokens**: ~900
**Focus**: Access Control (OWASP 1), Cryptographic Failures (OWASP 2), Authentication Failures (OWASP 7)

**Triggers**: Access Control, Broken Access Control, 認証, authentication, 認可, authorization, 暗号化, encryption, password, パスワード, session, セッション

**Coverage**:

- Broken Access Control - Authorization and ownership checks
- Cryptographic Failures - Password hashing, encryption, HTTPS
- Authentication Failures - Session management, JWT, refresh tokens

---

### 💉 Section 2: OWASP Injection Attacks

**File**: [`references/owasp-injection.md`](./references/owasp-injection.md)
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

**File**: [`references/owasp-advanced.md`](./references/owasp-advanced.md)
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

## 📋 Security Review Workflow

Copy this checklist and track your progress:

```
Security Review Checklist:
- [ ] Step 1: 入力検証確認
- [ ] Step 2: 認証・認可確認
- [ ] Step 3: データ保護確認
- [ ] Step 4: エラーハンドリング確認
- [ ] Step 5: 依存関係確認
```

### Step 1: 入力検証確認

- [ ] すべてのユーザー入力がサニタイズされている
- [ ] SQLクエリがパラメータ化されている
- [ ] コマンド実行にユーザー入力が直接使用されていない
- [ ] XSS対策（エスケープ処理）が適用されている

### Step 2: 認証・認可確認

- [ ] パスワードが適切にハッシュ化されている（bcrypt推奨）
- [ ] セッション管理が安全（HttpOnly, Secure, SameSite）
- [ ] JWTの有効期限が適切に設定されている
- [ ] 権限チェックがすべてのエンドポイントで実施されている

### Step 3: データ保護確認

- [ ] 機密データがログに出力されていない
- [ ] HTTPS が強制されている
- [ ] APIキーがコードにハードコードされていない
- [ ] 暗号化が必要なデータが保護されている

### Step 4: エラーハンドリング確認

- [ ] 詳細なエラーメッセージが本番環境で非表示
- [ ] スタックトレースがユーザーに公開されていない
- [ ] 一般的なエラーメッセージが使用されている

### Step 5: 依存関係確認

```bash
# npm/yarn プロジェクトの場合
npm audit
# または
yarn audit
```

- [ ] 既知の脆弱性がないことを確認
- [ ] 使用していない依存関係を削除

---

**Remember**: "Security is not about being perfect, it's about making it harder for attackers"
