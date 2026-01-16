# OWASP基本セキュリティ

## 1. 不適切なアクセス制御

| 問題               | 修正                                   |
| ------------------ | -------------------------------------- |
| 認証チェックなし   | `authenticate`ミドルウェア追加         |
| 所有権チェックなし | `req.user.id === resource.ownerId`検証 |
| IDOR               | リクエストごとにアクセス権検証         |

```typescript
app.get("/api/users/:id/profile", authenticate, (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  // ...
});
```

## 2. 暗号化の失敗

| Bad            | Good                  |
| -------------- | --------------------- |
| 平文パスワード | bcrypt/argon2ハッシュ |
| MD5/SHA1       | ソルト付きbcrypt      |
| HTTP           | HTTPS                 |

```typescript
import bcrypt from "bcrypt";
const hash = await bcrypt.hash(password, 10);
const valid = await bcrypt.compare(password, hash);
```

## 7. 認証の失敗

| 問題               | 修正                           |
| ------------------ | ------------------------------ |
| 弱いシークレット   | `process.env.SESSION_SECRET`   |
| 有効期限なし       | `maxAge: 1800000`（30分）      |
| アクセス可能Cookie | `httpOnly: true, secure: true` |

### セッション設定

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

### JWTパターン

```typescript
const accessToken = jwt.sign({ id }, secret, { expiresIn: "15m" });
const refreshToken = jwt.sign({ id }, refreshSecret, { expiresIn: "7d" });
```

## チェックリスト

| チェック   | 要件                        |
| ---------- | --------------------------- |
| 認証       | 全エンドポイント認証済み    |
| 所有権     | ユーザーは自分のデータのみ  |
| パスワード | bcryptでハッシュ化          |
| セッション | セキュアCookie設定          |
| トークン   | 短い有効期限 + リフレッシュ |
