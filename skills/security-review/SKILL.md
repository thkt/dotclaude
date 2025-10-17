---
name: security-review
description: >
  OWASP Top 10-based security review support skill.
  Triggers on keywords: "セキュリティ (security)", "脆弱性 (vulnerability)", "XSS", "SQLインジェクション (SQL injection)",
  "CSRF", "認証 (authentication)", "認可 (authorization)", "暗号化 (encryption)", "安全性 (safety)", "セキュアコーディング (secure coding)", etc.
  Auto-activates during code implementation or review.
  Detects common vulnerability patterns and suggests secure implementations.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
---

# Security Review - OWASP Top 10 Based Code Analysis

## 🎯 Core Philosophy

**"Security is not a feature, it's a foundation"**

Security should be built into the design from the start, not added afterward.

### What This Skill Provides

1. **OWASP Top 10-Based Checklist** - Industry-standard vulnerability patterns
2. **Practical Detection Patterns** - Identify dangerous patterns in code
3. **Secure Implementation Examples** - Specific methods to fix vulnerabilities
4. **Defensive Coding** - Design assuming attacks will happen

---

## 🔐 OWASP Top 10 (2021) Quick Reference

### 1. Broken Access Control

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

### 2. Cryptographic Failures

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

### 3. Injection

**One of the most dangerous vulnerabilities** - SQL, NoSQL, OS Command, LDAP

#### SQL Injection

```typescript
// ❌ Dangerous: String concatenation
const userId = req.params.id;
const query = `SELECT * FROM users WHERE id = ${userId}`;
// Attack: /api/users/1 OR 1=1--

// ✅ Secure: Parameterized query
const query = 'SELECT * FROM users WHERE id = ?';
const result = await db.query(query, [userId]);

// ✅ Secure: Using ORM
const user = await User.findById(userId);
```

#### NoSQL Injection

```typescript
// ❌ Dangerous: Direct user input
const user = await User.findOne({ username: req.body.username });

// Attack: { "username": { "$ne": null } } retrieves all users

// ✅ Secure: Input validation
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

#### Command Injection

```typescript
// ❌ Dangerous: Direct input to shell command
const { exec } = require('child_process');
exec(`ping ${req.body.host}`);
// Attack: "google.com; rm -rf /"

// ✅ Secure: Library usage or validation
import { isIP } from 'net';

if (!isIP(req.body.host)) {
  return res.status(400).json({ error: 'Invalid IP' });
}
// Better: Use library instead of exec
```

**Checkpoint**:

- [ ] Not using user input directly in SQL queries?
- [ ] Using parameterized queries or ORM?
- [ ] Not passing user input to shell commands?
- [ ] Implementing input validation and sanitization?

---

### 4. Insecure Design

**Design-level security flaws** - Rate limiting, business logic vulnerabilities

```typescript
// ❌ Dangerous: No rate limiting
app.post('/api/login', async (req, res) => {
  // Brute force attack possible
  const user = await authenticateUser(req.body.username, req.body.password);
});

// ✅ Secure: Rate limiting
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts max
  message: 'Too many login attempts, please try again later'
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const user = await authenticateUser(req.body.username, req.body.password);
});

// ✅ More secure: Account lockout
async function authenticateWithLockout(username: string, password: string) {
  const account = await getAccount(username);

  if (account.lockedUntil && account.lockedUntil > new Date()) {
    throw new Error('Account locked. Try again later.');
  }

  const valid = await verifyPassword(password, account.passwordHash);

  if (!valid) {
    account.failedAttempts++;
    if (account.failedAttempts >= 5) {
      account.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    }
    await account.save();
    throw new Error('Invalid credentials');
  }

  account.failedAttempts = 0;
  await account.save();
  return account;
}
```

**Checkpoint**:

- [ ] Rate limiting implemented?
- [ ] No loopholes in business logic?
- [ ] Multi-factor authentication for critical operations?
- [ ] Fail-safe design?

---

### 5. Security Misconfiguration

**Default settings, unnecessary features enabled**

```typescript
// ❌ Dangerous: Debug mode enabled
app.use(errorHandler({
  dumpExceptions: true,  // Stack trace exposed
  showStack: true
}));

// ✅ Secure: Environment-based configuration
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

// ❌ Dangerous: Allow all CORS
app.use(cors({ origin: '*' }));

// ✅ Secure: Allowed origins only
app.use(cors({
  origin: ['https://example.com', 'https://app.example.com'],
  credentials: true
}));

// ✅ Security headers
import helmet from 'helmet';
app.use(helmet());
```

**Checkpoint**:

- [ ] Debug mode disabled in production?
- [ ] Unnecessary features/endpoints disabled?
- [ ] Security headers (Helmet, etc.) configured?
- [ ] CORS properly configured?

---

### 6. Vulnerable Components

**Old libraries or dependencies with known vulnerabilities**

```bash
# Regular vulnerability scanning
npm audit
npm audit fix

# Or
yarn audit

# Using tools like Snyk
npx snyk test
```

**Checkpoint**:

- [ ] Running npm audit regularly?
- [ ] Keeping dependencies up to date?
- [ ] Removing unused libraries?
- [ ] Using automation tools like Dependabot?

---

### 7. Authentication Failures

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

---

### 8. Software Integrity Failures

**Unsigned updates, unverified loading from CDN**

```html
<!-- ❌ Dangerous: No SRI -->
<script src="https://cdn.example.com/lib.js"></script>

<!-- ✅ Secure: Subresource Integrity -->
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous">
</script>
```

**Checkpoint**:

- [ ] Using SRI (Subresource Integrity) for CDN resources?
- [ ] Verifying software update signatures?
- [ ] Detecting unauthorized changes in CI/CD pipeline?

---

### 9. Logging & Monitoring Failures

**Insufficient logging of security events**

```typescript
// ❌ Dangerous: No logging
app.post('/api/login', async (req, res) => {
  const user = await authenticateUser(req.body.username, req.body.password);
  // No logs for success or failure
});

// ✅ Secure: Security event logging
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

    logger.info('Login successful', {
      username: req.body.username,
      ip: req.ip,
      timestamp: new Date()
    });

    res.json({ token: generateToken(user) });
  } catch (error) {
    logger.warn('Login failed', {
      username: req.body.username,
      ip: req.ip,
      timestamp: new Date(),
      reason: error.message
    });

    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ❌ Dangerous: Logging sensitive information
logger.info('User data', { password: user.password });  // Absolutely NO

// ✅ Secure: Exclude sensitive information
logger.info('User data', {
  username: user.username,
  email: user.email
  // password not included
});
```

**Checkpoint**:

- [ ] Logging authentication failures and access denials?
- [ ] Not including sensitive information (passwords, tokens) in logs?
- [ ] Monitoring abnormal access patterns?
- [ ] Log tampering protection in place?

---

### 10. Server-Side Request Forgery (SSRF)

**Unintended requests from server side**

```typescript
// ❌ Dangerous: Request to user-specified URL
app.get('/api/fetch', async (req, res) => {
  const url = req.query.url;  // User input
  const response = await fetch(url);  // Can access internal resources
  res.json(await response.json());
});
// Attack: /api/fetch?url=http://localhost:6379/ (Redis)

// ✅ Secure: URL validation
function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Protocol restriction
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // Reject private IPs
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

    // Allow list
    const allowedDomains = ['api.example.com', 'cdn.example.com'];
    return allowedDomains.some(domain => hostname.endsWith(domain));
  } catch {
    return false;
  }
}

app.get('/api/fetch', async (req, res) => {
  const url = req.query.url as string;

  if (!isAllowedUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const response = await fetch(url);
  res.json(await response.json());
});
```

**Checkpoint**:

- [ ] Validating user-input URLs?
- [ ] Preventing access to private IPs?
- [ ] Using allow-list approach?

---

## 🔍 Frontend Security

### XSS (Cross-Site Scripting) Prevention

```tsx
// ❌ Dangerous: dangerouslySetInnerHTML
function UserComment({ comment }: { comment: string }) {
  return <div dangerouslySetInnerHTML={{ __html: comment }} />;
  // Attack: "<script>alert('XSS')</script>"
}

// ✅ Secure: Default escaping
function UserComment({ comment }: { comment: string }) {
  return <div>{comment}</div>;  // React auto-escapes
}

// ✅ When HTML is needed: Sanitize
import DOMPurify from 'dompurify';

function UserComment({ comment }: { comment: string }) {
  const sanitized = DOMPurify.sanitize(comment, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### CSRF (Cross-Site Request Forgery) Prevention

```typescript
// ✅ CSRF token
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

app.post('/api/transfer', csrfProtection, (req, res) => {
  // CSRF token validated
});

// ✅ SameSite Cookie (additional defense)
app.use(session({
  cookie: {
    sameSite: 'strict'  // or 'lax'
  }
}));
```

---

## 📋 Security Review Checklist

### Code Review Checklist

#### Authentication & Authorization

- [ ] All API endpoints require authentication
- [ ] Users can only access their own data
- [ ] Session/token expiration properly configured
- [ ] Passwords are hashed

#### Input Validation

- [ ] All user input validated
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] Command injection protection

#### Data Protection

- [ ] Sensitive data encrypted
- [ ] Using HTTPS
- [ ] Not logging sensitive information
- [ ] No sensitive information in error messages

#### Configuration

- [ ] Debug mode disabled
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Unnecessary features disabled

#### Dependencies

- [ ] No known vulnerabilities (npm audit)
- [ ] Unused libraries removed
- [ ] Regular updates

---

## 💡 Practical Application

### Auto-Trigger Example

```markdown
User: "Implement user registration API"

Security Review Skill triggers →

"From a security perspective, let's ensure:

1. Password hashing (using bcrypt)
2. Rate limiting (brute force protection)
3. Input validation (SQL injection protection)
4. HTTPS communication
5. CSRF token

I'll provide implementation examples..."
```

### Common Scenarios

1. **Implementing login functionality**
   - Suggest password hashing
   - Add rate limiting
   - Secure session management

2. **Creating APIs**
   - Verify authentication/authorization checks
   - Add input validation
   - Configure rate limiting

3. **Database operations**
   - Verify SQL injection protection
   - Recommend parameterized queries

4. **Implementing forms**
   - Add CSRF protection
   - Verify XSS protection

---

## ✨ Key Takeaways

1. **Defense in Depth** - Don't rely on a single measure
2. **Principle of Least Privilege** - Minimal permissions
3. **Fail Securely** - Safe even when failing
4. **Security by Default** - Secure by default

---

**Remember**: "Security is not about being perfect, it's about making it harder for attackers"
