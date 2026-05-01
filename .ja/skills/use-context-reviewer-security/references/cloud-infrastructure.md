# クラウド インフラ セキュリティ

## 1. IAM とアクセス制御

| 問題                      | 修正                         |
| ------------------------- | ---------------------------- |
| 本番で root アカウント    | IAM ロール、MFA 有効化       |
| 全リソースに `s3:*`       | 特定バケットに特定アクション |
| 長期クレデンシャル        | OIDC / assume role を使う    |
| クレデンシャル ローテなし | 90 日ごとにローテーション    |

```yaml
# 良い
iam_role:
  permissions: [s3:GetObject, s3:ListBucket]
  resources: [arn:aws:s3:::my-bucket/*]

# 悪い
iam_role:
  permissions: ["s3:*"]
  resources: ["*"]
```

## 2. シークレット管理

| 問題                           | 修正                              |
| ------------------------------ | --------------------------------- |
| ハードコードされたシークレット | Secrets Manager / Vault を使う    |
| `.env` をリポジトリに含める    | `.gitignore`、CI シークレット使用 |
| ローテーションなし             | 自動ローテーション (30-90 日)     |
| ログ / エラー内のシークレット  | センシティブ フィールドを除外     |

```typescript
// 良い
const client = new SecretsManager({ region: "us-east-1" });
const secret = await client.getSecretValue({ SecretId: "prod/api-key" });

// 悪い
const apiKey = "sk-1234567890";
```

## 3. ネットワーク セキュリティ

| 問題                       | 修正                          |
| -------------------------- | ----------------------------- |
| パブリックなデータベース   | `publicly_accessible = false` |
| SSH がインターネットに開放 | VPN / 踏み台 CIDR に制限      |
| 全ポート開放               | 必要なポートのみ許可          |
| VPC フローログなし         | 監査トレイル用に有効化        |

```terraform
# 良い
resource "aws_security_group" "app" {
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
}

# 悪い
resource "aws_security_group" "bad" {
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## 4. ロギングとモニタリング

| 問題                        | 修正                                |
| --------------------------- | ----------------------------------- |
| 監査ロギングなし            | CloudTrail/CloudWatch を有効化      |
| 短い保持期間                | コンプライアンス用に 90+ 日         |
| アラートなし                | 認証失敗、エラーでアラート          |
| ログ内のセンシティブ データ | PII、パスワード、トークンをフィルタ |

```typescript
// セキュリティ イベントをログ (センシティブ データを除外)
logger.warn("auth_failure", { userId: event.userId, ip: event.ip });
```

## 5. CI/CD パイプライン セキュリティ

| 問題                      | 修正                           |
| ------------------------- | ------------------------------ |
| 長期トークン              | クラウド認証に OIDC を使う     |
| シークレット スキャンなし | trufflehog/gitleaks を追加     |
| 依存関係監査なし          | `npm audit --audit-level=high` |
| 広い workflow 権限        | `permissions: contents: read`  |

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

## 6. CDN/WAF セキュリティ

| 問題             | 修正                               |
| ---------------- | ---------------------------------- |
| WAF なし         | OWASP Core Ruleset を有効化        |
| レート制限なし   | IP 単位の上限を設定                |
| ヘッダー欠落     | edge でセキュリティ ヘッダーを追加 |
| SSL/TLS 緩い設定 | TLS 1.2+ strict mode を強制        |

```typescript
// edge セキュリティ ヘッダー
headers.set("X-Frame-Options", "DENY");
headers.set("X-Content-Type-Options", "nosniff");
headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
```

## 7. バックアップと DR

| 問題                      | 修正                         |
| ------------------------- | ---------------------------- |
| 自動バックアップなし      | 日次バックアップ、30+ 日保持 |
| ポイント イン タイム なし | データベースで PITR を有効化 |
| 誤削除                    | 削除保護を有効化             |
| リカバリ未テスト          | 四半期ごとにテスト           |

```terraform
resource "aws_db_instance" "main" {
  backup_retention_period = 30
  deletion_protection     = true
  publicly_accessible     = false
}
```

## チェックリスト

| カテゴリ | 要件                                                   |
| -------- | ------------------------------------------------------ |
| IAM      | root なし、MFA 有効、最小権限、ローテーション          |
| Secrets  | secrets manager 内、自動ローテーション、ログに含めない |
| Network  | private DB、制限された SG、VPC フローログ              |
| Logging  | CloudTrail オン、90+ 日保持、アラート設定済み          |
| CI/CD    | OIDC 認証、シークレット スキャン、依存関係監査         |
| CDN/WAF  | WAF 有効、レート制限、セキュリティ ヘッダー            |
| Backup   | 日次自動、PITR 有効、削除保護                          |
| Encrypt  | 保管時 (KMS)、転送時 (TLS 1.2+)                        |
