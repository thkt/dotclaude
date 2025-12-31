# OWASP高度なセキュリティ - 設計、設定、監視、SSRF

## 4. 安全でない設計

**設計レベルのセキュリティ欠陥** - レート制限、ビジネスロジックの脆弱性

```typescript
// Bad: 危険: レート制限なし
app.post('/api/login', async (req, res) => {
  // ブルートフォース攻撃が可能
  const user = await authenticateUser(req.body.username, req.body.password);
});

// Good: 安全: レート制限
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回の試行
  message: 'ログイン試行が多すぎます。後でお試しください'
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const user = await authenticateUser(req.body.username, req.body.password);
});

// Good: より安全: アカウントロックアウト
async function authenticateWithLockout(username: string, password: string) {
  const account = await getAccount(username);

  if (account.lockedUntil && account.lockedUntil > new Date()) {
    throw new Error('アカウントがロックされています。後でお試しください。');
  }

  const valid = await verifyPassword(password, account.passwordHash);

  if (!valid) {
    account.failedAttempts++;
    if (account.failedAttempts >= 5) {
      account.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30分
    }
    await account.save();
    throw new Error('認証情報が無効です');
  }

  account.failedAttempts = 0;
  await account.save();
  return account;
}
```

**チェックポイント**:

- [ ] レート制限を実装している？
- [ ] ビジネスロジックに抜け穴がない？
- [ ] 重要な操作に多要素認証がある？
- [ ] フェイルセーフな設計になっている？

---

## 5. セキュリティの設定ミス

**デフォルト設定、不要な機能が有効**

```typescript
// Bad: 危険: デバッグモードが有効
app.use(errorHandler({
  dumpExceptions: true,  // スタックトレースが露出
  showStack: true
}));

// Good: 安全: 環境に基づく設定
if (process.env.NODE_ENV === 'production') {
  app.use(errorHandler({
    dumpExceptions: false,
    showStack: false
  }));
} else {
  app.use(errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
}

// Bad: 危険: すべてのCORSを許可
app.use(cors({ origin: '*' }));

// Good: 安全: 許可されたオリジンのみ
app.use(cors({
  origin: ['https://example.com', 'https://app.example.com'],
  credentials: true
}));

// Good: セキュリティヘッダー
import helmet from 'helmet';
app.use(helmet());
```

**チェックポイント**:

- [ ] 本番環境でデバッグモードが無効？
- [ ] 不要な機能/エンドポイントが無効？
- [ ] セキュリティヘッダー（Helmet等）が設定されている？
- [ ] CORSが適切に設定されている？

---

## 6. 脆弱なコンポーネント

**既知の脆弱性がある古いライブラリや依存関係**

```bash
# 定期的な脆弱性スキャン
npm audit
npm audit fix

# または
yarn audit

# Snykなどのツールを使用
npx snyk test
```

**チェックポイント**:

- [ ] npm auditを定期的に実行している？
- [ ] 依存関係を最新に保っている？
- [ ] 未使用のライブラリを削除している？
- [ ] Dependabotなどの自動化ツールを使用している？

---

## 8. ソフトウェアの整合性の失敗

**署名されていない更新、CDNからの未検証読み込み**

```html
<!-- ❌ 危険: SRIなし -->
<script src="https://cdn.example.com/lib.js"></script>

<!-- ✅ 安全: サブリソース整合性 -->
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous">
</script>
```

**チェックポイント**:

- [ ] CDNリソースにSRI（サブリソース整合性）を使用している？
- [ ] ソフトウェア更新の署名を検証している？
- [ ] CI/CDパイプラインで不正な変更を検出している？

---

## 9. ログと監視の失敗

**セキュリティイベントの不十分なログ記録**

```typescript
// Bad: 危険: ログなし
app.post('/api/login', async (req, res) => {
  const user = await authenticateUser(req.body.username, req.body.password);
  // 成功や失敗のログなし
});

// Good: 安全: セキュリティイベントのログ記録
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'security.log' })
  ]
});

app.post('/api/login', async (req, res) => {
  try {
    const user = await authenticateUser(req.body.username, req.body.password);

    logger.info('ログイン成功', {
      username: req.body.username,
      ip: req.ip,
      timestamp: new Date()
    });

    res.json({ token: generateToken(user) });
  } catch (error) {
    logger.warn('ログイン失敗', {
      username: req.body.username,
      ip: req.ip,
      timestamp: new Date(),
      reason: error.message
    });

    res.status(401).json({ error: '認証情報が無効です' });
  }
});

// Bad: 危険: 機密情報をログに記録
logger.info('ユーザーデータ', { password: user.password });  // 絶対ダメ

// Good: 安全: 機密情報を除外
logger.info('ユーザーデータ', {
  username: user.username,
  email: user.email
  // パスワードは含まない
});
```

**チェックポイント**:

- [ ] 認証失敗とアクセス拒否をログ記録している？
- [ ] ログに機密情報（パスワード、トークン）を含めていない？
- [ ] 異常なアクセスパターンを監視している？
- [ ] ログ改ざん対策を行っている？

---

## 10. サーバーサイドリクエストフォージェリ（SSRF）

**サーバーサイドからの意図しないリクエスト**

```typescript
// Bad: 危険: ユーザー指定URLへのリクエスト
app.get('/api/fetch', async (req, res) => {
  const url = req.query.url;  // ユーザー入力
  const response = await fetch(url);  // 内部リソースにアクセス可能
  res.json(await response.json());
});
// 攻撃: /api/fetch?url=http://localhost:6379/ (Redis)

// Good: 安全: URL検証
function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // プロトコル制限
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // プライベートIPを拒否
    const hostname = parsed.hostname;
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return false;
    }

    // 許可リスト
    const allowedDomains = ['api.example.com', 'cdn.example.com'];
    return allowedDomains.some(domain => hostname.endsWith(domain));
  } catch {
    return false;
  }
}

app.get('/api/fetch', async (req, res) => {
  const url = req.query.url as string;

  if (!isAllowedUrl(url)) {
    return res.status(400).json({ error: '無効なURL' });
  }

  const response = await fetch(url);
  res.json(await response.json());
});
```

**チェックポイント**:

- [ ] ユーザー入力のURLを検証している？
- [ ] プライベートIPへのアクセスを防いでいる？
- [ ] 許可リストアプローチを使用している？

---

## セキュリティレビューチェックリスト

### 認証と認可

- [ ] すべてのAPIエンドポイントが認証を要求
- [ ] ユーザーは自分のデータにのみアクセス可能
- [ ] セッション/トークンの有効期限が適切に設定
- [ ] パスワードがハッシュ化されている

### 入力検証

- [ ] すべてのユーザー入力を検証
- [ ] SQLインジェクション対策
- [ ] XSS対策
- [ ] コマンドインジェクション対策

### データ保護

- [ ] 機密データが暗号化されている
- [ ] HTTPSを使用
- [ ] ログに機密情報を記録しない
- [ ] エラーメッセージに機密情報を含まない

### 設定

- [ ] デバッグモードが無効
- [ ] セキュリティヘッダーが設定されている
- [ ] CORSが適切に設定されている
- [ ] 不要な機能が無効

### 依存関係

- [ ] 既知の脆弱性がない（npm audit）
- [ ] 未使用のライブラリを削除
- [ ] 定期的な更新
