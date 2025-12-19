# Evaluations for reviewing-security

## Selection Criteria

Keywords and contexts that should trigger this skill:

- Keywords: security, vulnerability, OWASP, XSS, SQL injection, authentication, authorization, encryption, sanitize
- Contexts: Security audit, code review for security, vulnerability assessment

## Evaluation Scenarios (JSON Format - Anthropic Official Best Practices)

### Scenario 1: Basic Security Review

```json
{
  "skills": ["reviewing-security"],
  "query": "I want to review the security of this API",
  "files": [],
  "expected_behavior": [
    "reviewing-security skill is triggered",
    "Checklist based on OWASP Top 10 is presented",
    "Input validation, authentication/authorization, error handling perspectives are included"
  ]
}
```

### Scenario 2: Input Validation

```json
{
  "skills": ["reviewing-security"],
  "query": "I want to verify user input validation methods",
  "files": [],
  "expected_behavior": [
    "Importance of input validation is explained",
    "Difference between sanitization and validation is clarified",
    "Specific implementation patterns are provided"
  ]
}
```

### Scenario 3: Authentication Review

```json
{
  "skills": ["reviewing-security"],
  "query": "I want to check if there are security issues in authentication functionality",
  "files": [],
  "expected_behavior": [
    "Authentication best practices are referenced",
    "Password hashing, session management, JWT perspectives are included",
    "Common vulnerability patterns are warned about"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered
- [ ] OWASP guidelines referenced
- [ ] Specific security concerns addressed
