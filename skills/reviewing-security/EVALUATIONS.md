# Evaluations for reviewing-security

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: security, セキュリティ, vulnerability, 脆弱性, XSS, Cross-Site Scripting, SQL injection, SQLインジェクション, CSRF, authentication, 認証, authorization, 認可, encryption, 暗号化, secure coding, セキュアコーディング, access control, OWASP, SSRF, password, パスワード, token, session, セッション, rate limiting, brute force, ブルートフォース, command injection, NoSQL injection
- **Contexts**: Security audit, code review for security, vulnerability assessment, authentication implementation

## Evaluation Scenarios

### Scenario 1: XSS Vulnerability Detection

```json
{
  "skills": ["reviewing-security"],
  "query": "このコードにXSS脆弱性がないかチェックして",
  "files": ["src/components/UserProfile.tsx"],
  "expected_behavior": [
    "Skill is triggered by 'XSS' and '脆弱性'",
    "Loads references/owasp-basic.md section",
    "Identifies dangerouslySetInnerHTML or unsafe patterns",
    "Explains input sanitization vs output encoding",
    "Provides secure implementation example"
  ]
}
```

### Scenario 2: SQL Injection Prevention

```json
{
  "skills": ["reviewing-security"],
  "query": "データベースクエリのセキュリティを確認したい",
  "files": ["src/repositories/UserRepository.ts"],
  "expected_behavior": [
    "Skill is triggered by 'データベース' and 'セキュリティ'",
    "Detects string concatenation in queries",
    "Recommends parameterized queries / prepared statements",
    "Shows secure vs insecure patterns",
    "References OWASP Injection guidelines"
  ]
}
```

### Scenario 3: Authentication Review

```json
{
  "skills": ["reviewing-security"],
  "query": "認証機能のセキュリティレビューをお願いします",
  "files": ["src/auth/login.ts"],
  "expected_behavior": [
    "Skill is triggered by '認証' and 'セキュリティ'",
    "Loads references/authentication.md section",
    "Checks password hashing (bcrypt/argon2)",
    "Verifies session management security",
    "Reviews JWT implementation if present"
  ]
}
```

### Scenario 4: Access Control Verification

```json
{
  "skills": ["reviewing-security"],
  "query": "APIエンドポイントのアクセス制御が正しいか確認して",
  "files": ["src/api/routes.ts"],
  "expected_behavior": [
    "Skill is triggered by 'アクセス制御'",
    "References OWASP A01: Broken Access Control",
    "Checks authorization middleware presence",
    "Identifies IDOR vulnerabilities",
    "Verifies role-based access control"
  ]
}
```

### Scenario 5: Comprehensive Security Audit

```json
{
  "skills": ["reviewing-security"],
  "query": "/audit でセキュリティレビューを実施したい",
  "files": ["src/"],
  "expected_behavior": [
    "Skill is triggered by '/audit' and 'セキュリティ'",
    "Applies OWASP Top 10 checklist systematically",
    "Prioritizes findings by severity",
    "Provides actionable remediation steps",
    "Integrates with security-reviewer agent"
  ]
}
```

## Progressive Disclosure Verification

This skill uses section-based content. Verify correct section loading:

| Query Contains | Expected Section Loaded |
| --- | --- |
| XSS, injection, CSRF, input | references/owasp-basic.md |
| authentication, password, session, JWT | references/authentication.md |
| access control, authorization, IDOR | references/access-control.md |

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by security-related keywords
- [ ] OWASP Top 10 was referenced appropriately
- [ ] Specific vulnerability patterns were identified
- [ ] Secure implementation examples were provided
- [ ] Severity/priority was indicated
- [ ] Progressive Disclosure was applied (section-based loading)

## Baseline Comparison

### Without Skill

- Generic security advice
- May miss OWASP patterns
- No systematic vulnerability checklist
- Lacks severity prioritization

### With Skill

- OWASP Top 10-based systematic review
- Specific vulnerability detection patterns
- Section-based Progressive Disclosure
- Severity-prioritized findings
- Secure implementation examples
