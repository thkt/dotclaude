# OWASP Basic Security - Access Control, Cryptography, Authentication

## 1. Broken Access Control

**Most common vulnerability** - Missing or improper authorization checks

```typescript
// ❌ Dangerous: No authorization check
app.get('/api/users/:id/profile', (req, res) => {
  const profile = db.getProfile(req.params.id);
  res.json(profile);  // Anyone can access anyone's profile
});

// ✅ Secure: Ownership check
app.get('/api/users/:id/profile', authenticate, (req, res) => {
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const profile = db.getProfile(req.params.id);
  res.json(profile);
});
```

**Checkpoint**:

- [ ] All API endpoints have authentication checks?
- [ ] Users can only access their own data?
- [ ] Admin functions properly protected?
- [ ] No IDOR (Insecure Direct Object Reference) vulnerabilities?

---

## 2. Cryptographic Failures

**Insufficient protection of sensitive data** - Passwords, credit cards, personal information encryption

```typescript
// ❌ Dangerous: Plain text password storage
const user = {
  username: 'john',
  password: 'mypassword123'  // Stored in plain text
};

// ✅ Secure: Hashed
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

const user = {
  username: 'john',
  passwordHash: await hashPassword('mypassword123')
};

// ✅ Verification
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Checkpoint**:

- [ ] Passwords hashed with bcrypt/argon2?
- [ ] Sensitive data encrypted?
- [ ] Using HTTPS?
- [ ] Not using old encryption algorithms (MD5, SHA1)?

---

## 7. Authentication Failures

**Weak password policies, poor session management**

```typescript
// ❌ Dangerous: Weak session management
app.use(session({
  secret: 'secret123',  // Weak secret
  resave: true,
  saveUninitialized: true
}));

// ✅ Secure: Secure session
import session from 'express-session';
import crypto from 'crypto';

app.use(session({
  secret: process.env.SESSION_SECRET,  // From environment variable
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,      // HTTPS only
    httpOnly: true,    // Not accessible via JavaScript
    maxAge: 1800000,   // 30 minutes
    sameSite: 'strict' // CSRF protection
  }
}));

// ✅ Using JWT
import jwt from 'jsonwebtoken';

function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }  // Short expiration
  );
}

// ✅ Refresh token pattern
function generateTokens(user: User) {
  const accessToken = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }  // Short
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env.REFRESH_SECRET!,
    { expiresIn: '7d' }   // Long
  );

  return { accessToken, refreshToken };
}
```

**Checkpoint**:

- [ ] Session IDs unpredictable?
- [ ] Session timeout configured?
- [ ] Cookie has secure, httpOnly, sameSite set?
- [ ] Password reset functionality secure?
