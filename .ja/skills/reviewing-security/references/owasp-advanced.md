# OWASP高度なセキュリティ

## 4. 安全でない設計

| 問題             | 修正                      |
| ---------------- | ------------------------- |
| レート制限なし   | `express-rate-limit`      |
| ブルートフォース | N回失敗後アカウントロック |
| MFAなし          | 重要操作に追加            |

```typescript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
});
app.post("/api/login", loginLimiter, handler);
```

## 5. セキュリティの設定ミス

| 問題         | 修正           |
| ------------ | -------------- |
| 本番デバッグ | `NODE_ENV`確認 |
| CORS `*`     | 特定オリジン   |
| ヘッダーなし | `helmet()`使用 |

```typescript
app.use(helmet());
app.use(
  cors({
    origin: ["https://example.com"],
    credentials: true,
  }),
);
```

## 6. 脆弱なコンポーネント

```bash
npm audit
npm audit fix
npx snyk test
```

## 8. ソフトウェアの整合性

```html
<!-- CDN用SRI -->
<script
  src="https://cdn/lib.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
```

## 9. ログの失敗

| ログする       | ログしない |
| -------------- | ---------- |
| 認証失敗       | パスワード |
| アクセス拒否   | トークン   |
| 不審なパターン | PII        |

```typescript
logger.warn("Login failed", {
  username: req.body.username,
  ip: req.ip,
  // パスワードなし
});
```

## 10. SSRF

| チェック   | 拒否                               |
| ---------- | ---------------------------------- |
| プロトコル | http/https以外                     |
| ホスト名   | localhost, 127._, 192.168._, 10.\* |
| ドメイン   | 許可リストにない                   |

## マスターチェックリスト

| カテゴリ | 項目                                 |
| -------- | ------------------------------------ |
| 認証     | エンドポイント保護、所有権検証       |
| 入力     | SQL/XSS/コマンドインジェクション防止 |
| データ   | 暗号化、HTTPS、ログに機密情報なし    |
| 設定     | デバッグオフ、ヘッダー設定、CORS制限 |
| 依存     | 脆弱性なし、更新済み、未使用削除     |
