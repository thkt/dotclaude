# OWASPインジェクション攻撃

## インジェクションタイプ

| タイプ  | ベクター                             | 防止                           |
| ------- | ------------------------------------ | ------------------------------ |
| SQL     | クエリ内文字列連結                   | パラメータ化クエリ、ORM        |
| NoSQL   | クエリ内オブジェクトインジェクション | 型検証                         |
| Command | exec/spawnにユーザー入力             | 入力検証、exec回避             |
| XSS     | エスケープなしHTML                   | React自動エスケープ、DOMPurify |

## SQLインジェクション

```typescript
// Bad
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Good
const query = "SELECT * FROM users WHERE id = ?";
await db.query(query, [userId]);
```

## NoSQLインジェクション

```typescript
// Bad - { "$ne": null }で全件取得
const user = await User.findOne({ username: req.body.username });

// Good
if (typeof req.body.username !== "string") throw new Error("Invalid");
const user = await User.findOne({ username: req.body.username });
```

## XSS防止

| 方法            | 説明                            |
| --------------- | ------------------------------- |
| Reactデフォルト | `{userInput}`を自動エスケープ   |
| DOMPurify       | レンダリング前にHTMLサニタイズ  |
| CSP             | Content-Security-Policyヘッダー |

```typescript
import DOMPurify from "dompurify";
const sanitized = DOMPurify.sanitize(untrustedHtml);
```

## CSRF防止

| 方法     | 実装                 |
| -------- | -------------------- |
| トークン | `csrf()`ミドルウェア |
| Cookie   | `sameSite: 'strict'` |

```typescript
import csrf from "csurf";
app.use(csrf({ cookie: { sameSite: "strict" } }));
// テンプレート: <input type="hidden" name="_csrf" value={req.csrfToken()} />
```

## チェックリスト

| チェック | 要件                       |
| -------- | -------------------------- |
| SQL      | パラメータ化クエリかORM    |
| NoSQL    | 入力の型検証               |
| Command  | execにユーザー入力なし     |
| XSS      | HTMLコンテンツをサニタイズ |
| CSRF     | トークン + SameSite Cookie |
