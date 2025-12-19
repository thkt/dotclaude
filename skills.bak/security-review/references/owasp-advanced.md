# OWASP Advanced Security - Design, Configuration, Monitoring, SSRF

## 4. Insecure Design

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

## 5. Security Misconfiguration

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

## 6. Vulnerable Components

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

## 8. Software Integrity Failures

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

## 9. Logging & Monitoring Failures

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

## 10. Server-Side Request Forgery (SSRF)

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

## Security Review Checklist

### Authentication & Authorization

- [ ] All API endpoints require authentication
- [ ] Users can only access their own data
- [ ] Session/token expiration properly configured
- [ ] Passwords are hashed

### Input Validation

- [ ] All user input validated
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] Command injection protection

### Data Protection

- [ ] Sensitive data encrypted
- [ ] Using HTTPS
- [ ] Not logging sensitive information
- [ ] No sensitive information in error messages

### Configuration

- [ ] Debug mode disabled
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Unnecessary features disabled

### Dependencies

- [ ] No known vulnerabilities (npm audit)
- [ ] Unused libraries removed
- [ ] Regular updates
