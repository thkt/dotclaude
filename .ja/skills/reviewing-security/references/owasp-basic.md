# OWASP基本セキュリティ - アクセス制御、暗号化、認証

## 1. 不適切なアクセス制御

**最も一般的な脆弱性** - 認可チェックの欠落または不適切

```typescript
// Bad: 危険: 認可チェックなし
app.get('/api/users/:id/profile', (req, res) => {
  const profile = db.getProfile(req.params.id);
  res.json(profile);  // 誰でも誰のプロフィールにもアクセス可能
});

// Good: 安全: 所有権チェック
app.get('/api/users/:id/profile', authenticate, (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'アクセス禁止' });
  }
  const profile = db.getProfile(req.params.id);
  res.json(profile);
});
```

**チェックポイント**:

- [ ] すべてのAPIエンドポイントに認証チェックがある？
- [ ] ユーザーは自分のデータにのみアクセスできる？
- [ ] 管理者機能が適切に保護されている？
- [ ] IDOR（安全でない直接オブジェクト参照）脆弱性がない？

---

## 2. 暗号化の失敗

**機密データの保護不足** - パスワード、クレジットカード、個人情報の暗号化

```typescript
// Bad: 危険: 平文パスワード保存
const user = {
  username: 'john',
  password: 'mypassword123'  // 平文で保存
};

// Good: 安全: ハッシュ化
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

const user = {
  username: 'john',
  passwordHash: await hashPassword('mypassword123')
};

// Good: 検証
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**チェックポイント**:

- [ ] パスワードはbcrypt/argon2でハッシュ化されている？
- [ ] 機密データは暗号化されている？
- [ ] HTTPSを使用している？
- [ ] 古い暗号アルゴリズム（MD5、SHA1）を使用していない？

---

## 7. 認証の失敗

**弱いパスワードポリシー、不適切なセッション管理**

```typescript
// Bad: 危険: 弱いセッション管理
app.use(session({
  secret: 'secret123',  // 弱いシークレット
  resave: true,
  saveUninitialized: true
}));

// Good: 安全: セキュアなセッション
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
    sameSite: 'strict' // CSRF対策
  }
}));

// Good: JWTを使用
import jwt from 'jsonwebtoken';

function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }  // 短い有効期限
  );
}

// Good: リフレッシュトークンパターン
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

- [ ] セッションIDは予測不可能？
- [ ] セッションタイムアウトが設定されている？
- [ ] Cookieにsecure、httpOnly、sameSiteが設定されている？
- [ ] パスワードリセット機能は安全？
