# OWASP Injection Attacks - SQL, NoSQL, Command Injection

## 3. Injection

**One of the most dangerous vulnerabilities** - SQL, NoSQL, OS Command, LDAP

### SQL Injection

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

### NoSQL Injection

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

### Command Injection

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

## Frontend XSS Prevention

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
