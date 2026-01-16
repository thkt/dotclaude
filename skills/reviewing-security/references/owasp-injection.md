# OWASP Injection Attacks

## Injection Types

| Type    | Vector                        | Prevention                   |
| ------- | ----------------------------- | ---------------------------- |
| SQL     | String concatenation in query | Parameterized queries, ORM   |
| NoSQL   | Object injection in query     | Type validation              |
| Command | User input in exec/spawn      | Input validation, avoid exec |
| XSS     | Unescaped HTML                | React auto-escape, DOMPurify |

## SQL Injection

```typescript
// Bad
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Good
const query = "SELECT * FROM users WHERE id = ?";
await db.query(query, [userId]);
```

## NoSQL Injection

```typescript
// Bad - { "$ne": null } retrieves all
const user = await User.findOne({ username: req.body.username });

// Good
if (typeof req.body.username !== "string") throw new Error("Invalid");
const user = await User.findOne({ username: req.body.username });
```

## XSS Prevention

| Method        | Description                    |
| ------------- | ------------------------------ |
| React default | Auto-escapes `{userInput}`     |
| DOMPurify     | Sanitize HTML before rendering |
| CSP           | Content-Security-Policy header |

## CSRF Prevention

| Method | Implementation       |
| ------ | -------------------- |
| Token  | `csrf()` middleware  |
| Cookie | `sameSite: 'strict'` |

## Checklist

| Check   | Requirement                  |
| ------- | ---------------------------- |
| SQL     | Parameterized queries or ORM |
| NoSQL   | Type validation on input     |
| Command | No user input in exec        |
| XSS     | Sanitize any HTML content    |
| CSRF    | Token + SameSite cookie      |
