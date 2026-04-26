# クラウドインフラセキュリティ

## 1. IAM & アクセス制御

| 問題                         | 修正                         |
| ---------------------------- | ---------------------------- |
| 本番環境でrootアカウント使用 | IAMロール使用、MFA有効化     |
| 全リソースに`s3:*`           | 特定バケットに特定アクション |
| 長期間有効な認証情報         | OIDC/assume role使用         |
| 認証情報ローテーションなし   | 90日ごとにローテーション     |

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

## 2. シークレット管理

| 問題                           | 修正                             |
| ------------------------------ | -------------------------------- |
| ハードコードされたシークレット | Secrets Manager / Vault使用      |
| リポジトリ内の`.env`           | `.gitignore`、CIシークレット使用 |
| ローテーションなし             | 自動ローテーション（30-90日）    |
| ログ/エラーにシークレット      | 機密フィールド除外               |

```typescript
// Good
const client = new SecretsManager({ region: "us-east-1" });
const secret = await client.getSecretValue({ SecretId: "prod/api-key" });

// Bad
const apiKey = "sk-1234567890";
```

## 3. ネットワークセキュリティ

| 問題                      | 修正                          |
| ------------------------- | ----------------------------- |
| パブリックデータベース    | `publicly_accessible = false` |
| SSHがインターネットに公開 | VPN/bastionのCIDRに制限       |
| 全ポート開放              | 必要なポートのみ許可          |
| VPCフローログなし         | 監査証跡のため有効化          |

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

## 4. ログ & モニタリング

| 問題             | 修正                            |
| ---------------- | ------------------------------- |
| 監査ログなし     | CloudTrail/CloudWatch有効化     |
| 短い保持期間     | コンプライアンスのため90日以上  |
| アラートなし     | 認証失敗、エラーにアラート設定  |
| ログに機密データ | PII、パスワード、トークンを除外 |

```typescript
// セキュリティイベントをログ（機密データ除外）
logger.warn("auth_failure", { userId: event.userId, ip: event.ip });
```

## 5. CI/CDパイプラインセキュリティ

| 問題                       | 修正                           |
| -------------------------- | ------------------------------ |
| 長期間有効なトークン       | クラウド認証にOIDC使用         |
| シークレットスキャンなし   | trufflehog/gitleaks追加        |
| 依存関係監査なし           | `npm audit --audit-level=high` |
| ワークフロー権限が広すぎる | `permissions: contents: read`  |

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

## 6. CDN/WAFセキュリティ

| 問題           | 修正                             |
| -------------- | -------------------------------- |
| WAFなし        | OWASPコアルールセット有効化      |
| レート制限なし | IP単位の制限設定                 |
| ヘッダー欠落   | エッジでセキュリティヘッダー追加 |
| SSL/TLSが緩い  | TLS 1.2+厳格モード強制           |

```typescript
// エッジセキュリティヘッダー
headers.set("X-Frame-Options", "DENY");
headers.set("X-Content-Type-Options", "nosniff");
headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
```

## 7. バックアップ & DR

| 問題                   | 修正                           |
| ---------------------- | ------------------------------ |
| 自動バックアップなし   | 毎日バックアップ、30日以上保持 |
| ポイントインタイムなし | データベースにPITR有効化       |
| 誤削除の可能性         | 削除保護有効化                 |
| リカバリ未テスト       | 四半期ごとにテスト             |

```terraform
resource "aws_db_instance" "main" {
  backup_retention_period = 30
  deletion_protection     = true
  publicly_accessible     = false
}
```

## チェックリスト

| カテゴリ     | 要件                                                           |
| ------------ | -------------------------------------------------------------- |
| IAM          | root不使用、MFA有効、最小権限、ローテーション                  |
| シークレット | シークレットマネージャー内、自動ローテーション、ログに含めない |
| ネットワーク | プライベートDB、制限されたSG、VPCフローログ                    |
| ログ         | CloudTrail有効、90日以上保持、アラート設定                     |
| CI/CD        | OIDC認証、シークレットスキャン、依存関係監査                   |
| CDN/WAF      | WAF有効、レート制限、セキュリティヘッダー                      |
| バックアップ | 毎日自動、PITR有効、削除保護                                   |
| 暗号化       | 保存時（KMS）、転送時（TLS 1.2+）                              |
