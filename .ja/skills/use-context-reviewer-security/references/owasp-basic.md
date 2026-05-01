# OWASP 基本セキュリティ

## 1. Broken Access Control

| 問題               | 修正                                      |
| ------------------ | ----------------------------------------- |
| 認証チェックなし   | `authenticate` ミドルウェアを追加         |
| 所有権チェックなし | `req.user.id === resource.ownerId` を検証 |
| IDOR               | リクエストごとにアクセス権を検証          |

```typescript
app.get("/api/users/:id/profile", authenticate, (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  // ...
});
```

## 2. Cryptographic Failures

| 悪い           | 良い                   |
| -------------- | ---------------------- |
| 平文パスワード | bcrypt/argon2 ハッシュ |
| MD5/SHA1       | bcrypt + salt          |
| HTTP           | HTTPS                  |

```typescript
import bcrypt from "bcrypt";
const hash = await bcrypt.hash(password, 10);
const valid = await bcrypt.compare(password, hash);
```

## 7. Authentication Failures

| 問題                  | 修正                           |
| --------------------- | ------------------------------ |
| 弱いシークレット      | `process.env.SESSION_SECRET`   |
| 有効期限なし          | `maxAge: 1800000` (30 分)      |
| アクセス可能な cookie | `httpOnly: true, secure: true` |

### Session 設定

```typescript
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 1800000,
      sameSite: "strict",
    },
  }),
);
```

### JWT パターン

```typescript
const accessToken = jwt.sign({ id }, secret, { expiresIn: "15m" });
const refreshToken = jwt.sign({ id }, refreshSecret, { expiresIn: "7d" });
```

## チェックリスト

| 項目       | 要件                               |
| ---------- | ---------------------------------- |
| 認証       | 全エンドポイントで認証             |
| 所有権     | ユーザーは自身のデータのみアクセス |
| パスワード | bcrypt でハッシュ化                |
| Sessions   | 安全な cookie 設定                 |
| Tokens     | 短い有効期限と refresh             |
