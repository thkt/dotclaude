# Evaluations for security-review

## Selection Criteria

このスキルがトリガーされるべきキーワードとコンテキスト:

- Keywords: セキュリティ, 脆弱性, OWASP, XSS, SQL injection, 認証, 認可, 暗号化, sanitize
- Contexts: Security audit, code review for security, vulnerability assessment

## Evaluation Scenarios (JSON Format - Anthropic公式Best Practices準拠)

### Scenario 1: Basic Security Review

```json
{
  "skills": ["security-review"],
  "query": "このAPIのセキュリティをレビューしたい",
  "files": [],
  "expected_behavior": [
    "security-review skillがトリガーされる",
    "OWASP Top 10に基づくチェックリストが提示される",
    "入力検証、認証・認可、エラーハンドリングの観点が含まれる"
  ]
}
```

### Scenario 2: Input Validation

```json
{
  "skills": ["security-review"],
  "query": "ユーザー入力の検証方法を確認したい",
  "files": [],
  "expected_behavior": [
    "入力検証の重要性が説明される",
    "サニタイズとバリデーションの違いが明確にされる",
    "具体的な実装パターンが提供される"
  ]
}
```

### Scenario 3: Authentication Review

```json
{
  "skills": ["security-review"],
  "query": "認証機能にセキュリティ問題がないか確認したい",
  "files": [],
  "expected_behavior": [
    "認証ベストプラクティスが参照される",
    "パスワードハッシュ、セッション管理、JWT等の観点が含まれる",
    "一般的な脆弱性パターンが警告される"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered
- [ ] OWASP guidelines referenced
- [ ] Specific security concerns addressed
- [ ] Response was in Japanese
