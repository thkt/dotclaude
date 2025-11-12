---
name: security-review
description: >
  OWASP Top 10ベースのセキュリティレビューと脆弱性検出スキル。
  トリガーキーワード: "セキュリティ", "security", "脆弱性", "vulnerability", "XSS",
  "Cross-Site Scripting", "SQLインジェクション", "SQL injection", "CSRF", "Cross-Site Request Forgery",
  "認証", "authentication", "認可", "authorization", "暗号化", "encryption", "安全性", "safety",
  "secure", "セキュアコーディング", "secure coding", "injection", "access control", "OWASP",
  "SSRF", "Server-Side Request Forgery", "password", "パスワード", "token", "session", "セッション",
  "rate limiting", "brute force", "ブルートフォース", "Access Control", "Broken Access Control",
  "Cryptographic Failures", "Command Injection", "NoSQL injection", "Security Misconfiguration",
  "logging", "monitoring", "dependencies", "脆弱性スキャン"。
  コード実装やレビュー中に自動的にアクティブ化され、一般的な脆弱性パターンを検出し、
  OWASP Top 10に基づいて安全な実装を提案。基本セキュリティ（アクセス制御、暗号化、認証）、
  インジェクション攻撃（SQL、XSS、CSRF）、高度なトピック（レート制限、SSRF、設定、監視）のセクションを含む。
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
---

# Security Review - OWASP Top 10 ベースのコード分析

## 🎯 コア哲学

**「セキュリティは機能ではなく、基盤である」**

セキュリティは後から追加するものではなく、設計の初期段階から組み込むべきです。

### このスキルが提供するもの

1. **OWASP Top 10 ベースのチェックリスト** - 業界標準の脆弱性パターン
2. **実践的な検出パターン** - コード内の危険なパターンを識別
3. **安全な実装例** - 脆弱性を修正する具体的な方法
4. **防御的コーディング** - 攻撃が起こることを前提とした設計

---

## 🔐 OWASP Top 10 (2021) クイックリファレンス

### 1. アクセス制御の不備

**最も一般的な脆弱性** - 認可チェックの欠如または不適切な実装

```typescript
// ❌ 危険: 認可チェックなし
app.get('/api/users/:id/profile', (req, res) => {
  const profile = db.getProfile(req.params.id);
  res.json(profile);  // 誰でも他人のプロフィールにアクセス可能
});

// ✅ 安全: 所有権チェック
app.get('/api/users/:id/profile', authenticate, (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const profile = db.getProfile(req.params.id);
  res.json(profile);
});
```

**チェックポイント**:

- [ ] すべてのAPIエンドポイントに認証チェックがあるか?
- [ ] ユーザーは自分のデータのみにアクセスできるか?
- [ ] 管理者機能は適切に保護されているか?
- [ ] IDOR(安全でない直接オブジェクト参照)の脆弱性はないか?

---

### 2. 暗号化の失敗

**機密データの不十分な保護** - パスワード、クレジットカード、個人情報の暗号化

```typescript
// ❌ 危険: 平文パスワード保存
const user = {
  username: 'john',
  password: 'mypassword123'  // 平文で保存
};

// ✅ 安全: ハッシュ化
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

const user = {
  username: 'john',
  passwordHash: await hashPassword('mypassword123')
};

// ✅ 検証
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**チェックポイント**:

- [ ] パスワードはbcrypt/argon2でハッシュ化されているか?
- [ ] 機密データは暗号化されているか?
- [ ] HTTPSを使用しているか?
- [ ] 古い暗号化アルゴリズム(MD5、SHA1)を使用していないか?

---

### 3. インジェクション

**最も危険な脆弱性の1つ** - SQL、NoSQL、OSコマンド、LDAP

#### SQL インジェクション

```typescript
// ❌ 危険: 文字列連結
const userId = req.params.id;
const query = `SELECT * FROM users WHERE id = ${userId}`;
// 攻撃: /api/users/1 OR 1=1--

// ✅ 安全: パラメータ化クエリ
const query = 'SELECT * FROM users WHERE id = ?';
const result = await db.query(query, [userId]);

// ✅ 安全: ORM使用
const user = await User.findById(userId);
```

#### NoSQL インジェクション

```typescript
// ❌ 危険: ユーザー入力を直接使用
const user = await User.findOne({ username: req.body.username });

// 攻撃: { "username": { "$ne": null } } で全ユーザーを取得

// ✅ 安全: 入力検証
function sanitizeMongoQuery(input: any): string {
  if (typeof input !== 'string') {
    throw new Error('Invalid input');
  }
  return input;
}

const user = await User.findOne({
  username: sanitizeMongoQuery(req.body.username)
});
```

#### コマンドインジェクション

```typescript
// ❌ 危険: シェルコマンドへの直接入力
const { exec } = require('child_process');
exec(`ping ${req.body.host}`);
// 攻撃: "google.com; rm -rf /"

// ✅ 安全: ライブラリ使用または検証
import { isIP } from 'net';

if (!isIP(req.body.host)) {
  return res.status(400).json({ error: 'Invalid IP' });
}
// より良い: execの代わりにライブラリを使用
```

**チェックポイント**:

- [ ] SQLクエリでユーザー入力を直接使用していないか?
- [ ] パラメータ化クエリまたはORMを使用しているか?
- [ ] シェルコマンドにユーザー入力を渡していないか?
- [ ] 入力検証とサニタイズを実装しているか?

---

### 4. 安全でない設計

**設計レベルのセキュリティ欠陥** - レート制限、ビジネスロジックの脆弱性

```typescript
// ❌ 危険: レート制限なし
app.post('/api/login', async (req, res) => {
  // ブルートフォース攻撃が可能
  const user = await authenticateUser(req.body.username, req.body.password);
});

// ✅ 安全: レート制限
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回まで
  message: 'ログイン試行回数が多すぎます。後でもう一度お試しください'
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const user = await authenticateUser(req.body.username, req.body.password);
});

// ✅ より安全: アカウントロックアウト
async function authenticateWithLockout(username: string, password: string) {
  const account = await getAccount(username);

  if (account.lockedUntil && account.lockedUntil > new Date()) {
    throw new Error('アカウントがロックされています。後でもう一度お試しください。');
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

- [ ] レート制限が実装されているか?
- [ ] ビジネスロジックに抜け穴がないか?
- [ ] 重要な操作に多要素認証があるか?
- [ ] フェイルセーフ設計か?

---

### 5. セキュリティ設定ミス

**デフォルト設定、不要な機能の有効化**

```typescript
// ❌ 危険: デバッグモード有効
app.use(errorHandler({
  dumpExceptions: true,  // スタックトレース公開
  showStack: true
}));

// ✅ 安全: 環境ベースの設定
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

// ❌ 危険: すべてのCORSを許可
app.use(cors({ origin: '*' }));

// ✅ 安全: 許可されたオリジンのみ
app.use(cors({
  origin: ['https://example.com', 'https://app.example.com'],
  credentials: true
}));

// ✅ セキュリティヘッダー
import helmet from 'helmet';
app.use(helmet());
```

**チェックポイント**:

- [ ] 本番環境でデバッグモードが無効か?
- [ ] 不要な機能/エンドポイントが無効か?
- [ ] セキュリティヘッダー(Helmetなど)が設定されているか?
- [ ] CORSが適切に設定されているか?

---

### 6. 脆弱で古くなったコンポーネント

**既知の脆弱性を持つ古いライブラリや依存関係**

```bash
# 定期的な脆弱性スキャン
npm audit
npm audit fix

# または
yarn audit

# Snykなどのツール使用
npx snyk test
```

**チェックポイント**:

- [ ] npm auditを定期的に実行しているか?
- [ ] 依存関係を最新に保っているか?
- [ ] 未使用のライブラリを削除しているか?
- [ ] Dependabotなどの自動化ツールを使用しているか?

---

### 7. 認証の失敗

**弱いパスワードポリシー、不適切なセッション管理**

```typescript
// ❌ 危険: 弱いセッション管理
app.use(session({
  secret: 'secret123',  // 弱いシークレット
  resave: true,
  saveUninitialized: true
}));

// ✅ 安全: 安全なセッション
import session from 'express-session';
import crypto from 'crypto';

app.use(session({
  secret: process.env.SESSION_SECRET,  // 環境変数から
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,      // HTTPSのみ
    httpOnly: true,    // JavaScriptからアクセス不可
    maxAge: 1800000,   // 30分
    sameSite: 'strict' // CSRF保護
  }
}));

// ✅ JWT使用
import jwt from 'jsonwebtoken';

function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }  // 短い有効期限
  );
}

// ✅ リフレッシュトークンパターン
function generateTokens(user: User) {
  const accessToken = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }  // 短い
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env.REFRESH_SECRET!,
    { expiresIn: '7d' }   // 長い
  );

  return { accessToken, refreshToken };
}
```

**チェックポイント**:

- [ ] セッションIDが予測不可能か?
- [ ] セッションタイムアウトが設定されているか?
- [ ] Cookieにsecure、httpOnly、sameSiteが設定されているか?
- [ ] パスワードリセット機能は安全か?

---

### 8. ソフトウェアとデータの整合性の不具合

**署名されていないアップデート、CDNからの未検証読み込み**

```html
<!-- ❌ 危険: SRIなし -->
<script src="https://cdn.example.com/lib.js"></script>

<!-- ✅ 安全: Subresource Integrity -->
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous">
</script>
```

**チェックポイント**:

- [ ] CDNリソースにSRI(Subresource Integrity)を使用しているか?
- [ ] ソフトウェア更新の署名を検証しているか?
- [ ] CI/CDパイプラインで不正な変更を検出しているか?

---

### 9. ログとモニタリングの不足

**セキュリティイベントの不十分なログ記録**

```typescript
// ❌ 危険: ログなし
app.post('/api/login', async (req, res) => {
  const user = await authenticateUser(req.body.username, req.body.password);
  // 成功・失敗のログなし
});

// ✅ 安全: セキュリティイベントのログ記録
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

// ❌ 危険: 機密情報のログ記録
logger.info('ユーザーデータ', { password: user.password });  // 絶対にNG

// ✅ 安全: 機密情報を除外
logger.info('ユーザーデータ', {
  username: user.username,
  email: user.email
  // passwordは含めない
});
```

**チェックポイント**:

- [ ] 認証失敗とアクセス拒否をログ記録しているか?
- [ ] ログに機密情報(パスワード、トークン)を含めていないか?
- [ ] 異常なアクセスパターンを監視しているか?
- [ ] ログの改ざん防止策があるか?

---

### 10. サーバーサイドリクエストフォージェリ (SSRF)

**サーバー側からの意図しないリクエスト**

```typescript
// ❌ 危険: ユーザー指定URLへのリクエスト
app.get('/api/fetch', async (req, res) => {
  const url = req.query.url;  // ユーザー入力
  const response = await fetch(url);  // 内部リソースにアクセス可能
  res.json(await response.json());
});
// 攻撃: /api/fetch?url=http://localhost:6379/ (Redis)

// ✅ 安全: URL検証
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

- [ ] ユーザー入力のURLを検証しているか?
- [ ] プライベートIPへのアクセスを防いでいるか?
- [ ] 許可リスト方式を使用しているか?

---

## 🔍 フロントエンドセキュリティ

### XSS (クロスサイトスクリプティング) 対策

```tsx
// ❌ 危険: dangerouslySetInnerHTML
function UserComment({ comment }: { comment: string }) {
  return <div dangerouslySetInnerHTML={{ __html: comment }} />;
  // 攻撃: "<script>alert('XSS')</script>"
}

// ✅ 安全: デフォルトのエスケープ
function UserComment({ comment }: { comment: string }) {
  return <div>{comment}</div>;  // React が自動的にエスケープ
}

// ✅ HTMLが必要な場合: サニタイズ
import DOMPurify from 'dompurify';

function UserComment({ comment }: { comment: string }) {
  const sanitized = DOMPurify.sanitize(comment, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### CSRF (クロスサイトリクエストフォージェリ) 対策

```typescript
// ✅ CSRFトークン
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

app.post('/api/transfer', csrfProtection, (req, res) => {
  // CSRFトークンが検証される
});

// ✅ SameSite Cookie(追加の防御)
app.use(session({
  cookie: {
    sameSite: 'strict'  // または 'lax'
  }
}));
```

---

## 📋 セキュリティレビューチェックリスト

### コードレビューチェックリスト

#### 認証と認可

- [ ] すべてのAPIエンドポイントに認証が必要
- [ ] ユーザーは自分のデータのみにアクセス可能
- [ ] セッション/トークンの有効期限が適切に設定
- [ ] パスワードはハッシュ化されている

#### 入力検証

- [ ] すべてのユーザー入力が検証されている
- [ ] SQLインジェクション対策
- [ ] XSS対策
- [ ] コマンドインジェクション対策

#### データ保護

- [ ] 機密データが暗号化されている
- [ ] HTTPSを使用している
- [ ] 機密情報をログに記録していない
- [ ] エラーメッセージに機密情報が含まれていない

#### 設定

- [ ] デバッグモードが無効
- [ ] セキュリティヘッダーが設定されている
- [ ] CORSが適切に設定されている
- [ ] 不要な機能が無効化されている

#### 依存関係

- [ ] 既知の脆弱性がない(npm audit)
- [ ] 未使用のライブラリが削除されている
- [ ] 定期的に更新されている

---

## 💡 実践的応用

### 自動トリガー例

```markdown
ユーザー: "ユーザー登録APIを実装"

Security Review スキルがトリガー →

「セキュリティの観点から、以下を確認しましょう:

1. パスワードのハッシュ化(bcrypt使用)
2. レート制限(ブルートフォース攻撃対策)
3. 入力検証(SQLインジェクション対策)
4. HTTPS通信
5. CSRFトークン

実装例を提供します...」
```

### 一般的なシナリオ

1. **ログイン機能の実装**
   - パスワードハッシュ化を提案
   - レート制限を追加
   - 安全なセッション管理

2. **API作成**
   - 認証/認可チェックを確認
   - 入力検証を追加
   - レート制限を設定

3. **データベース操作**
   - SQLインジェクション対策を確認
   - パラメータ化クエリを推奨

4. **フォーム実装**
   - CSRF保護を追加
   - XSS対策を確認

---

## ✨ 重要なポイント

1. **多層防御** - 単一の対策に依存しない
2. **最小権限の原則** - 最小限の権限
3. **安全な失敗** - 失敗時も安全
4. **デフォルトで安全** - デフォルト設定が安全

---

**覚えておいてください**: 「セキュリティは完璧である必要はなく、攻撃者にとって困難にすることが重要」
