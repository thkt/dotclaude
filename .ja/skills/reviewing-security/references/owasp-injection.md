# OWASPインジェクション攻撃 - SQL、NoSQL、コマンドインジェクション

## 3. インジェクション

**最も危険な脆弱性の一つ** - SQL、NoSQL、OSコマンド、LDAP

### SQLインジェクション

```typescript
// Bad: 危険: 文字列連結
const userId = req.params.id;
const query = `SELECT * FROM users WHERE id = ${userId}`;
// 攻撃: /api/users/1 OR 1=1--

// Good: 安全: パラメータ化クエリ
const query = 'SELECT * FROM users WHERE id = ?';
const result = await db.query(query, [userId]);

// Good: 安全: ORMを使用
const user = await User.findById(userId);
```

### NoSQLインジェクション

```typescript
// Bad: 危険: 直接のユーザー入力
const user = await User.findOne({ username: req.body.username });

// 攻撃: { "username": { "$ne": null } } で全ユーザーを取得

// Good: 安全: 入力検証
function sanitizeMongoQuery(input: any): string {
  if (typeof input !== 'string') {
    throw new Error('無効な入力');
  }
  return input;
}

const user = await User.findOne({
  username: sanitizeMongoQuery(req.body.username)
});
```

### コマンドインジェクション

```typescript
// Bad: 危険: シェルコマンドへの直接入力
const { exec } = require('child_process');
exec(`ping ${req.body.host}`);
// 攻撃: "google.com; rm -rf /"

// Good: 安全: ライブラリ使用または検証
import { isIP } from 'net';

if (!isIP(req.body.host)) {
  return res.status(400).json({ error: '無効なIP' });
}
// より良い: execの代わりにライブラリを使用
```

**チェックポイント**:

- [ ] SQLクエリにユーザー入力を直接使用していない？
- [ ] パラメータ化クエリまたはORMを使用している？
- [ ] シェルコマンドにユーザー入力を渡していない？
- [ ] 入力検証とサニタイズを実装している？

---

## フロントエンドXSS対策

### XSS（クロスサイトスクリプティング）対策

```tsx
// Bad: 危険: dangerouslySetInnerHTML
function UserComment({ comment }: { comment: string }) {
  return <div dangerouslySetInnerHTML={{ __html: comment }} />;
  // 攻撃: "<script>alert('XSS')</script>"
}

// Good: 安全: デフォルトエスケープ
function UserComment({ comment }: { comment: string }) {
  return <div>{comment}</div>;  // Reactが自動エスケープ
}

// Good: HTMLが必要な場合: サニタイズ
import DOMPurify from 'dompurify';

function UserComment({ comment }: { comment: string }) {
  const sanitized = DOMPurify.sanitize(comment, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### CSRF（クロスサイトリクエストフォージェリ）対策

```typescript
// Good: CSRFトークン
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

app.post('/api/transfer', csrfProtection, (req, res) => {
  // CSRFトークン検証済み
});

// Good: SameSite Cookie（追加防御）
app.use(session({
  cookie: {
    sameSite: 'strict'  // または 'lax'
  }
}));
```
