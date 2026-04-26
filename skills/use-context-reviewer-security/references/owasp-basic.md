# OWASP Basic Security

## 1. Broken Access Control

| Issue              | Fix                                       |
| ------------------ | ----------------------------------------- |
| No auth check      | Add `authenticate` middleware             |
| No ownership check | Verify `req.user.id === resource.ownerId` |
| IDOR               | Validate access rights per request        |

```typescript
app.get("/api/users/:id/profile", authenticate, (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  // ...
});
```

## 2. Cryptographic Failures

| Bad                 | Good               |
| ------------------- | ------------------ |
| Plain text password | bcrypt/argon2 hash |
| MD5/SHA1            | bcrypt with salt   |
| HTTP                | HTTPS              |

```typescript
import bcrypt from "bcrypt";
const hash = await bcrypt.hash(password, 10);
const valid = await bcrypt.compare(password, hash);
```

## 7. Authentication Failures

| Issue             | Fix                            |
| ----------------- | ------------------------------ |
| Weak secret       | `process.env.SESSION_SECRET`   |
| No expiry         | `maxAge: 1800000` (30min)      |
| Accessible cookie | `httpOnly: true, secure: true` |

### Session Config

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

### JWT Pattern

```typescript
const accessToken = jwt.sign({ id }, secret, { expiresIn: "15m" });
const refreshToken = jwt.sign({ id }, refreshSecret, { expiresIn: "7d" });
```

## Checklist

| Check     | Requirement                 |
| --------- | --------------------------- |
| Auth      | All endpoints authenticated |
| Ownership | Users access own data only  |
| Passwords | Hashed with bcrypt          |
| Sessions  | Secure cookie config        |
| Tokens    | Short expiry + refresh      |
