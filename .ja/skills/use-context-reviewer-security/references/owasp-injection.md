# OWASP インジェクション攻撃

## インジェクションの種類

| 種別    | ベクトル                    | 防止策                            |
| ------- | --------------------------- | --------------------------------- |
| SQL     | クエリ内の文字列連結        | パラメータ化クエリ、ORM           |
| NoSQL   | クエリ内のオブジェクト注入  | 型バリデーション                  |
| Command | exec/spawn 内のユーザー入力 | 入力バリデーション、exec を避ける |
| XSS     | エスケープされない HTML     | React 自動エスケープ、DOMPurify   |

## SQL インジェクション

```typescript
// 悪い
const query = `SELECT * FROM users WHERE id = ${userId}`;

// 良い
const query = "SELECT * FROM users WHERE id = ?";
await db.query(query, [userId]);
```

## NoSQL インジェクション

```typescript
// 悪い - { "$ne": null } で全件取得される
const user = await User.findOne({ username: req.body.username });

// 良い
if (typeof req.body.username !== "string") throw new Error("Invalid");
const user = await User.findOne({ username: req.body.username });
```

## XSS 防止

| 手法             | 説明                               |
| ---------------- | ---------------------------------- |
| React デフォルト | `{userInput}` を自動エスケープ     |
| DOMPurify        | レンダリング前に HTML をサニタイズ |
| CSP              | Content-Security-Policy ヘッダー   |

```typescript
import DOMPurify from "dompurify";
const sanitized = DOMPurify.sanitize(untrustedHtml);
```

## CSRF 防止

| 手法     | 実装                  |
| -------- | --------------------- |
| トークン | `csrf()` ミドルウェア |
| Cookie   | `sameSite: 'strict'`  |

```typescript
import csrf from "csurf";
app.use(csrf({ cookie: { sameSite: "strict" } }));
// テンプレート: <input type="hidden" name="_csrf" value={req.csrfToken()} />
```

## チェックリスト

| 項目    | 要件                            |
| ------- | ------------------------------- |
| SQL     | パラメータ化クエリまたは ORM    |
| NoSQL   | 入力に型バリデーション          |
| Command | exec にユーザー入力を渡さない   |
| XSS     | HTML コンテンツは必ずサニタイズ |
| CSRF    | トークン + SameSite cookie      |
