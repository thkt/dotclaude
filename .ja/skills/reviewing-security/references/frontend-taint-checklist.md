# フロントエンドTaintチェックリスト

フロントエンドコードレビュー用のTaint分析パターン。正規表現パターンマッチングを超えたデータフロー理解が必要であり、guardrails の静的ルールを補完する。

## Taintパターン

### 1. サニタイザなしの dangerouslySetInnerHTML

**Source**: ユーザー入力、APIレスポンス、URLパラメータ
**Sink**: `dangerouslySetInnerHTML={{ __html: value }}`

| チェック         | 質問                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| サニタイザあり？ | `DOMPurify.sanitize()` 等が代入前に呼ばれているか？                        |
| サニタイザ設定？ | 設定が危険なタグ（`<script>`, `<iframe>`, `<object>`）を許可していないか？ |
| バイパス可能？   | 条件分岐やエラーハンドリングでサニタイザをスキップできないか？             |

```tsx
// VULNERABLE: 未サニタイズのAPIレスポンス
<div dangerouslySetInnerHTML={{ __html: apiResponse.body }} />

// SAFE: 使用前にサニタイズ
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(apiResponse.body) }} />
```

### 2. postMessage Origin検証

**Source**: `window.addEventListener('message', handler)`
**Sink**: ハンドラ内のDOM操作、ステート更新、ナビゲーション

| チェック     | 質問                                                                           |
| ------------ | ------------------------------------------------------------------------------ |
| Origin確認？ | ハンドラが `event.origin` を許可リストに対して検証しているか？                 |
| Origin厳密？ | originが `===` で比較されているか（`.includes()` や `.startsWith()` でなく）？ |
| データ検証？ | `event.data` が使用前にバリデーション/型付けされているか？                     |

```ts
// VULNERABLE: origin未チェック
window.addEventListener("message", (e) => {
  setState(e.data); // 任意のoriginからデータ注入可能
});

// SAFE: 厳密なorigin検証
window.addEventListener("message", (e) => {
  if (e.origin !== "https://trusted.example.com") return;
  const data = schema.parse(e.data);
  setState(data);
});
```

### 3. URLパラメータからリダイレクトフロー

**Source**: `URLSearchParams`, `location.search`, `location.hash`, ルートパラメータ
**Sink**: `location.href`, `location.replace()`, `location.assign()`, `window.open()`

| チェック         | 質問                                                           |
| ---------------- | -------------------------------------------------------------- |
| 許可リスト？     | リダイレクト先が許可ドメインのリストに対して検証されているか？ |
| 相対パスのみ？   | URLが相対パスに強制されているか（プロトコルなし、`//` なし）？ |
| プロトコル確認？ | `javascript:` と `data:` プロトコルがブロックされているか？    |

```ts
// VULNERABLE: URLパラメータを直接リダイレクトに使用
const next = new URLSearchParams(location.search).get("next");
location.href = next; // オープンリダイレクト

// SAFE: URLをパースしてorigin + パス名を検証
const next = new URLSearchParams(location.search).get("next");
if (next) {
  const url = new URL(next, location.origin);
  if (url.origin === location.origin && ALLOWED_PATHS.some((p) => url.pathname.startsWith(p))) {
    location.href = url.pathname;
  }
}
```

### 4. 関数引数からDOMメソッド

**Source**: 関数パラメータ、コールバック引数
**Sink**: `innerHTML`, `outerHTML`, `insertAdjacentHTML()`, `document.write()`

| チェック           | 質問                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| 呼び出し元監査？   | 全呼び出し箇所が安全な（サニタイズ済みまたはリテラル）値を渡しているか？ |
| 型制約？           | 関数シグネチャが入力型を制限しているか（例：ブランド型）？               |
| 境界でサニタイズ？ | サニタイズが呼び出し元責任ではなく関数境界で適用されているか？           |

```ts
// VULNERABLE: 関数が呼び出し元のサニタイズを信頼
function renderContent(html: string) {
  container.innerHTML = html; // 任意の呼び出し元が未サニタイズ入力を渡せる
}

// SAFE: 境界でサニタイズ
function renderContent(html: string) {
  container.innerHTML = DOMPurify.sanitize(html);
}
```

### 5. localStorage内のJWT

**Source**: 認証レスポンス、トークンリフレッシュ
**Sink**: `localStorage.setItem('token', jwt)`, `sessionStorage.setItem('auth', jwt)`

| チェック       | 質問                                                                               |
| -------------- | ---------------------------------------------------------------------------------- |
| ストレージ型？ | localStorage/sessionStorageの代わりに `httpOnly` cookieを使用しているか？          |
| XSS露出？      | アプリにXSS緩和策（CSP、サニタイズ）があり、トークン窃取リスクが低減されているか？ |
| トークン範囲？ | トークンにXSS経由で露出する機密クレームが含まれていないか？                        |

```ts
// VULNERABLE: 任意のXSSでJWTにアクセス可能
localStorage.setItem("token", response.jwt);
// XSSでdocument.cookieは効かないが、localStorage.getItem('token')は可能

// SAFE: サーバー設定のhttpOnly cookie
// Server response: Set-Cookie: token=jwt; HttpOnly; Secure; SameSite=Strict
// Client: トークン処理不要、cookieが自動送信
```

### 6. javascript: URLを持つhref変数

**Source**: ユーザー入力、データベース値、APIレスポンス
**Sink**: `<a href={variable}>`, `location.href = variable`

| チェック              | 質問                                                            |
| --------------------- | --------------------------------------------------------------- |
| プロトコル検証？      | URLが `https://`, `http://`, `/` で始まることを確認しているか？ |
| javascript:ブロック？ | `javascript:` プロトコルが明示的にブロックされているか？        |
| data:ブロック？       | `data:` プロトコルが明示的にブロックされているか？              |

```tsx
// VULNERABLE: ユーザー制御のhref
<a href={userProfile.website}>Visit</a>; // "javascript:alert(1)" の可能性

// SAFE: プロトコル許可リスト
function safeHref(url: string): string {
  const parsed = new URL(url, location.origin);
  if (!["https:", "http:"].includes(parsed.protocol)) return "#";
  return parsed.href;
}
<a href={safeHref(userProfile.website)}>Visit</a>;
```

## レビューワークフロー

1. Taintソースを特定（ユーザー入力、APIレスポンス、URLパラメータ）
2. シンクへのデータフローを追跡（DOM操作、ナビゲーション、ストレージ）
3. 全source-to-sinkパスでサニタイズ/バリデーションが存在することを検証
4. サニタイズがバイパスできないことを確認（エラーパス、条件分岐）
