# reviewing-securityの評価

## 選択基準

このスキルをトリガーするキーワードとコンテキスト:

- **キーワード**: security, セキュリティ, vulnerability, 脆弱性, XSS, Cross-Site Scripting, SQL injection, SQLインジェクション, CSRF, authentication, 認証, authorization, 認可, encryption, 暗号化, secure coding, セキュアコーディング, access control, OWASP, SSRF, password, パスワード, token, session, セッション, rate limiting, brute force, ブルートフォース, command injection, NoSQL injection
- **コンテキスト**: セキュリティ監査、セキュリティのためのコードレビュー、脆弱性評価、認証実装

## 評価シナリオ

### シナリオ1: XSS脆弱性検出

```json
{
  "skills": ["reviewing-security"],
  "query": "このコードにXSS脆弱性がないかチェックして",
  "files": ["src/components/UserProfile.tsx"],
  "expected_behavior": [
    "スキルが'XSS'と'脆弱性'でトリガーされる",
    "references/owasp-basic.mdセクションをロード",
    "dangerouslySetInnerHTMLや安全でないパターンを特定",
    "入力サニタイズと出力エンコーディングを説明",
    "安全な実装例を提供"
  ]
}
```

### シナリオ2: SQLインジェクション防止

```json
{
  "skills": ["reviewing-security"],
  "query": "データベースクエリのセキュリティを確認したい",
  "files": ["src/repositories/UserRepository.ts"],
  "expected_behavior": [
    "スキルが'データベース'と'セキュリティ'でトリガーされる",
    "クエリ内の文字列連結を検出",
    "パラメータ化クエリ/プリペアドステートメントを推奨",
    "安全なパターンと安全でないパターンを示す",
    "OWASPインジェクションガイドラインを参照"
  ]
}
```

### シナリオ3: 認証レビュー

```json
{
  "skills": ["reviewing-security"],
  "query": "認証機能のセキュリティレビューをお願いします",
  "files": ["src/auth/login.ts"],
  "expected_behavior": [
    "スキルが'認証'と'セキュリティ'でトリガーされる",
    "references/authentication.mdセクションをロード",
    "パスワードハッシュ（bcrypt/argon2）をチェック",
    "セッション管理のセキュリティを検証",
    "存在する場合はJWT実装をレビュー"
  ]
}
```

### シナリオ4: アクセス制御検証

```json
{
  "skills": ["reviewing-security"],
  "query": "APIエンドポイントのアクセス制御が正しいか確認して",
  "files": ["src/api/routes.ts"],
  "expected_behavior": [
    "スキルが'アクセス制御'でトリガーされる",
    "OWASP A01: アクセス制御の不備を参照",
    "認可ミドルウェアの存在をチェック",
    "IDOR脆弱性を特定",
    "ロールベースアクセス制御を検証"
  ]
}
```

### シナリオ5: 包括的セキュリティ監査

```json
{
  "skills": ["reviewing-security"],
  "query": "/audit でセキュリティレビューを実施したい",
  "files": ["src/"],
  "expected_behavior": [
    "スキルが'/audit'と'セキュリティ'でトリガーされる",
    "OWASP Top 10チェックリストを体系的に適用",
    "深刻度で所見を優先順位付け",
    "実行可能な修正手順を提供",
    "security-reviewerエージェントと統合"
  ]
}
```

## プログレッシブ開示の検証

このスキルはセクションベースのコンテンツを使用。正しいセクションロードを検証:

| クエリに含まれる | 期待されるロードセクション |
| --- | --- |
| XSS, injection, CSRF, input | references/owasp-basic.md |
| authentication, password, session, JWT | references/authentication.md |
| access control, authorization, IDOR | references/access-control.md |

## 手動検証チェックリスト

各シナリオ実行後:

- [ ] スキルがセキュリティ関連キーワードで正しくトリガーされた
- [ ] OWASP Top 10が適切に参照された
- [ ] 具体的な脆弱性パターンが特定された
- [ ] 安全な実装例が提供された
- [ ] 深刻度/優先度が示された
- [ ] プログレッシブ開示が適用された（セクションベースロード）

## ベースライン比較

### スキルなし

- 一般的なセキュリティアドバイス
- OWASPパターンを見逃す可能性
- 体系的な脆弱性チェックリストなし
- 深刻度の優先順位付けの欠如

### スキルあり

- OWASP Top 10ベースの体系的レビュー
- 具体的な脆弱性検出パターン
- セクションベースのプログレッシブ開示
- 深刻度で優先順位付けされた所見
- 安全な実装例
