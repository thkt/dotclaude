# フロントエンド taint チェックリスト

フロントエンド コード レビューの taint 解析パターン。regex マッチングを超えるデータフロー理解が必要で、guardrails の静的ルールを補完する。

## taint パターン

### 1. サニタイザなしの dangerouslySetInnerHTML

| flow   | 対象                                          |
| ------ | --------------------------------------------- |
| source | ユーザー入力、API レスポンス、URL パラメータ  |
| sink   | `dangerouslySetInnerHTML={{ __html: value }}` |

| チェック           | 問い                                                                               |
| ------------------ | ---------------------------------------------------------------------------------- |
| サニタイザがあるか | 代入前に `DOMPurify.sanitize()` 等が呼ばれているか                                 |
| サニタイザ設定     | サニタイザ設定が危険なタグ (`<script>`, `<iframe>`, `<object>`) を許可していないか |
| バイパスの可能性   | 条件分岐やエラーハンドリングでサニタイザをスキップできるか                         |

```tsx
// 脆弱: サニタイズされていない API レスポンス
<div dangerouslySetInnerHTML={{ __html: apiResponse.body }} />

// 安全: 利用前にサニタイズ
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(apiResponse.body) }} />
```

### 2. postMessage の origin 検証

| flow   | 対象                                              |
| ------ | ------------------------------------------------- |
| source | `window.addEventListener('message', handler)`     |
| sink   | ハンドラ内の DOM 操作、state 更新、ナビゲーション |

| チェック            | 問い                                                             |
| ------------------- | ---------------------------------------------------------------- |
| origin 検証あり     | ハンドラが `event.origin` を許可リストと照合しているか           |
| origin 厳密性       | `.includes()` や `.startsWith()` ではなく `===` で比較しているか |
| data バリデーション | `event.data` が利用前にバリデーション/型付けされているか         |

```ts
// 脆弱: origin チェックなし
window.addEventListener("message", (e) => {
  setState(e.data); // 任意の origin が data を注入できる
});

// 安全: 厳密な origin 検証
window.addEventListener("message", (e) => {
  if (e.origin !== "https://trusted.example.com") return;
  const data = schema.parse(e.data);
  setState(data);
});
```

### 3. URL パラメータからリダイレクトへのフロー

| flow   | 対象                                                                        |
| ------ | --------------------------------------------------------------------------- |
| source | `URLSearchParams`, `location.search`, `location.hash`, ルートパラメータ     |
| sink   | `location.href`, `location.replace()`, `location.assign()`, `window.open()` |

| チェック       | 問い                                                             |
| -------------- | ---------------------------------------------------------------- |
| 許可リスト     | リダイレクト先は許可ドメインのリストでバリデーションされているか |
| 相対のみか     | URL は相対に強制されているか (プロトコルなし、`//` なし)         |
| プロトコル検査 | `javascript:` や `data:` プロトコルがブロックされているか        |

```ts
// 脆弱: URL パラメータをそのままリダイレクトに使用
const next = new URLSearchParams(location.search).get("next");
location.href = next; // open redirect

// 安全: URL をパースし origin と pathname をバリデーション
const next = new URLSearchParams(location.search).get("next");
if (next) {
  const url = new URL(next, location.origin);
  if (url.origin === location.origin && ALLOWED_PATHS.some((p) => url.pathname.startsWith(p))) {
    location.href = url.pathname;
  }
}
```

### 4. 関数引数から DOM メソッドへ

| flow   | 対象                                                                 |
| ------ | -------------------------------------------------------------------- |
| source | 関数パラメータ、コールバック引数                                     |
| sink   | `innerHTML`, `outerHTML`, `insertAdjacentHTML()`, `document.write()` |

| チェック           | 問い                                                                       |
| ------------------ | -------------------------------------------------------------------------- |
| 呼び出し元監査済み | すべての呼び出し元が安全 (サニタイズ済みまたはリテラル) な値を渡しているか |
| 型による強制       | 関数シグネチャが入力型を制限しているか (例: branded type)                  |
| 境界でサニタイズ   | 呼び出し元責務ではなく、関数境界でサニタイズが適用されているか             |

```ts
// 脆弱: サニタイズを呼び出し元に任せる関数
function renderContent(html: string) {
  container.innerHTML = html; // 任意の呼び出し元がサニタイズなしの入力を渡せる
}

// 安全: 境界でサニタイズ
function renderContent(html: string) {
  container.innerHTML = DOMPurify.sanitize(html);
}
```

### 5. localStorage 内の JWT

| flow   | 対象                                                                        |
| ------ | --------------------------------------------------------------------------- |
| source | 認証レスポンス、トークン リフレッシュ                                       |
| sink   | `localStorage.setItem('token', jwt)`, `sessionStorage.setItem('auth', jwt)` |

| チェック          | 問い                                                                      |
| ----------------- | ------------------------------------------------------------------------- |
| 保存方式          | localStorage/sessionStorage の代わりに `httpOnly` cookie が使われているか |
| XSS 露出          | XSS 緩和 (CSP、サニタイズ) があり、トークン窃取リスクが下がっているか     |
| トークン スコープ | トークンに XSS 経由で露出するセンシティブな claim が含まれていないか      |

```ts
// 脆弱: JWT があらゆる XSS からアクセス可能
localStorage.setItem("token", response.jwt);
// XSS による窃取: document.cookie は使えないが localStorage.getItem('token') は使える

// 安全: サーバーが httpOnly cookie をセット
// サーバー応答: Set-Cookie: token=jwt; HttpOnly; Secure; SameSite=Strict
// クライアント: トークン処理不要、cookie が自動送信される
```

### 6. javascript: URL を持つ href 変数

| flow   | 対象                                              |
| ------ | ------------------------------------------------- |
| source | ユーザー入力、データベース値、API レスポンス      |
| sink   | `<a href={variable}>`, `location.href = variable` |

| チェック                  | 問い                                                                 |
| ------------------------- | -------------------------------------------------------------------- |
| プロトコル バリデーション | URL が `https://`, `http://`, `/` のいずれかで始まるか確認しているか |
| javascript: ブロック      | `javascript:` プロトコルが明示的にブロックされているか               |
| data: ブロック            | `data:` プロトコルが明示的にブロックされているか                     |

```tsx
// 脆弱: ユーザー制御の href
<a href={userProfile.website}>Visit</a>; // "javascript:alert(1)" にもなりうる

// 安全: プロトコル許可リスト
function safeHref(url: string): string {
  const parsed = new URL(url, location.origin);
  if (!["https:", "http:"].includes(parsed.protocol)) return "#";
  return parsed.href;
}
<a href={safeHref(userProfile.website)}>Visit</a>;
```

## レビュー ワークフロー

1. ユーザー入力・API レスポンス・URL パラメータの taint source を特定
2. DOM 操作・ナビゲーション・ストレージの sink までデータフローを追跡
3. すべての source-to-sink 経路でサニタイズ / バリデーションが存在することを検証
4. サニタイズがエラー経路や条件分岐でバイパスされないことを確認
