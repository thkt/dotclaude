# Cloud Infrastructure Security

## 1. IAM & Access Control

| Issue                   | Fix                                  |
| ----------------------- | ------------------------------------ |
| Root account in prod    | Use IAM roles, enable MFA            |
| `s3:*` on all resources | Specific actions on specific buckets |
| Long-lived credentials  | Use OIDC/assume role                 |
| No credential rotation  | Rotate every 90 days                 |

```yaml
# Good
iam_role:
  permissions: [s3:GetObject, s3:ListBucket]
  resources: [arn:aws:s3:::my-bucket/*]

# Bad
iam_role:
  permissions: ["s3:*"]
  resources: ["*"]
```

## 2. Secrets Management

| Issue                  | Fix                          |
| ---------------------- | ---------------------------- |
| Hardcoded secrets      | Use Secrets Manager / Vault  |
| `.env` in repo         | `.gitignore`, use CI secrets |
| No rotation            | Auto-rotate (30-90 days)     |
| Secrets in logs/errors | Exclude sensitive fields     |

```typescript
// Good
const client = new SecretsManager({ region: "us-east-1" });
const secret = await client.getSecretValue({ SecretId: "prod/api-key" });

// Bad
const apiKey = "sk-1234567890";
```

## 3. Network Security

| Issue                | Fix                           |
| -------------------- | ----------------------------- |
| Public database      | `publicly_accessible = false` |
| SSH open to internet | Restrict to VPN/bastion CIDR  |
| All ports open       | Allow only required ports     |
| No VPC flow logs     | Enable for audit trail        |

```terraform
# Good
resource "aws_security_group" "app" {
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
}

# Bad
resource "aws_security_group" "bad" {
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## 4. Logging & Monitoring

| Issue                 | Fix                            |
| --------------------- | ------------------------------ |
| No audit logging      | Enable CloudTrail/CloudWatch   |
| Short retention       | 90+ days for compliance        |
| No alerts             | Alert on auth failures, errors |
| Sensitive data in log | Filter PII, passwords, tokens  |

```typescript
// Log security events (exclude sensitive data)
logger.warn("auth_failure", { userId: event.userId, ip: event.ip });
```

## 5. CI/CD Pipeline Security

| Issue                | Fix                            |
| -------------------- | ------------------------------ |
| Long-lived tokens    | Use OIDC for cloud auth        |
| No secrets scanning  | Add trufflehog/gitleaks        |
| No dependency audit  | `npm audit --audit-level=high` |
| Broad workflow perms | `permissions: contents: read`  |

```yaml
jobs:
  deploy:
    permissions:
      contents: read
    steps:
      - uses: trufflesecurity/trufflehog@v3.92.5
      - run: npm audit --audit-level=high
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/deploy
```

## 6. CDN/WAF Security

| Issue              | Fix                          |
| ------------------ | ---------------------------- |
| No WAF             | Enable OWASP Core Ruleset    |
| No rate limiting   | Configure per-IP limits      |
| Missing headers    | Add security headers at edge |
| SSL/TLS permissive | Enforce TLS 1.2+ strict mode |

```typescript
// Edge security headers
headers.set("X-Frame-Options", "DENY");
headers.set("X-Content-Type-Options", "nosniff");
headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
```

## 7. Backup & DR

| Issue               | Fix                              |
| ------------------- | -------------------------------- |
| No automated backup | Daily backups, 30+ day retention |
| No point-in-time    | Enable PITR for databases        |
| Accidental deletion | Enable deletion protection       |
| Untested recovery   | Test quarterly                   |

```terraform
resource "aws_db_instance" "main" {
  backup_retention_period = 30
  deletion_protection     = true
  publicly_accessible     = false
}
```

## Checklist

| Category | Requirements                                         |
| -------- | ---------------------------------------------------- |
| IAM      | No root, MFA enabled, least privilege, rotation      |
| Secrets  | In secrets manager, auto-rotation, not in logs       |
| Network  | Private DB, restricted SGs, VPC flow logs            |
| Logging  | CloudTrail on, 90+ days retention, alerts configured |
| CI/CD    | OIDC auth, secrets scanning, dependency audit        |
| CDN/WAF  | WAF enabled, rate limiting, security headers         |
| Backup   | Daily automated, PITR enabled, deletion protection   |
| Encrypt  | At rest (KMS), in transit (TLS 1.2+)                 |
