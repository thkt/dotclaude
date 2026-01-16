# OWASP Advanced Security

## 4. Insecure Design

| Issue         | Fix                           |
| ------------- | ----------------------------- |
| No rate limit | `express-rate-limit`          |
| Brute force   | Account lockout after N fails |
| No MFA        | Add for critical ops          |

```typescript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
});
app.post("/api/login", loginLimiter, handler);
```

## 5. Security Misconfiguration

| Issue         | Fix              |
| ------------- | ---------------- |
| Debug in prod | Check `NODE_ENV` |
| CORS `*`      | Specific origins |
| No headers    | Use `helmet()`   |

```typescript
app.use(helmet());
app.use(
  cors({
    origin: ["https://example.com"],
    credentials: true,
  }),
);
```

## 6. Vulnerable Components

```bash
npm audit
npm audit fix
npx snyk test
```

## 8. Software Integrity

```html
<!-- SRI for CDN -->
<script
  src="https://cdn/lib.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
```

## 9. Logging Failures

| Log                 | Don't Log |
| ------------------- | --------- |
| Auth failures       | Passwords |
| Access denied       | Tokens    |
| Suspicious patterns | PII       |

```typescript
logger.warn("Login failed", {
  username: req.body.username,
  ip: req.ip,
  // NO password
});
```

## 10. SSRF

| Check    | Reject                             |
| -------- | ---------------------------------- |
| Protocol | Not http/https                     |
| Hostname | localhost, 127._, 192.168._, 10.\* |
| Domain   | Not in allowlist                   |

## Master Checklist

| Category | Items                                   |
| -------- | --------------------------------------- |
| Auth     | Endpoints protected, ownership verified |
| Input    | SQL/XSS/command injection prevented     |
| Data     | Encrypted, HTTPS, no sensitive in logs  |
| Config   | Debug off, headers set, CORS restricted |
| Deps     | No vulns, updated, unused removed       |
