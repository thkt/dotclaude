# Calibration Examples

audit reviewer 向けのドメイン別 REPORT/SKIP 例。各 reviewer がこのファイルを参照する。原則は `finding-schema.md` にある。

## CQ (reviewer-readability)

### REPORT

```typescript
function processOrder(order, user, config, db, logger) {
  if (order.items) {
    if (order.items.length > 0) {
      for (const item of order.items) {
        if (item.quantity > 0) {
          if (item.price !== undefined) {
            const t = item.price * item.quantity;
            // ...20 more lines
          }
        }
      }
    }
  }
}
```

| Field   | Value                                      |
| ------- | ------------------------------------------ |
| Filter  | Senior Engineer Test pass: 変更を要請する  |
| Trigger | この関数に出会った任意の読み手             |
| Impact  | 5 段ネスト + 6 引数 + 1 文字変数で読めない |

### SKIP

```typescript
function createUser(name: string, email: string): User {
  const normalized = email.toLowerCase().trim();
  const user = { id: generateId(), name, email: normalized, createdAt: new Date() };
  return user;
}
```

| Field  | Value                                                                  |
| ------ | ---------------------------------------------------------------------- |
| Filter | Senior Engineer Test fail: 好みの問題、欠陥ではない                    |
| Signal | `normalized` と `user` は可読性に寄与; inline しても明瞭性は変わらない |

## EFF (reviewer-efficiency)

### REPORT

```rust
fn search(&self, query: &str) -> Vec<Result> {
    let db = Connection::open(&self.db_path).unwrap();  // opens on every call
    let embedding = self.embed(query);
    db.query("SELECT * FROM chunks ORDER BY distance(?, embedding)", [embedding])
}
```

| Field   | Value                                                             |
| ------- | ----------------------------------------------------------------- |
| Filter  | Harm Test pass: ホットパスでの計測可能な無駄                      |
| Trigger | ユーザー検索のたび                                                |
| Impact  | プール再利用ではなく呼び出しごとに新規 DB 接続; レイテンシ + leak |
| Path    | Hot: ユーザー向け関数                                             |

### SKIP

```rust
fn init_config() -> Config {
    let home = std::env::var("HOME").unwrap_or_default();
    let xdg = std::env::var("XDG_CONFIG_HOME").unwrap_or_default();
    let path = if xdg.is_empty() {
        PathBuf::from(&home).join(".config/app")
    } else {
        PathBuf::from(&xdg).join("app")
    };
    Config::load(path)
}
```

| Field  | Value                                                          |
| ------ | -------------------------------------------------------------- |
| Filter | Context Test: cold path                                        |
| Signal | 起動時 1 回実行、env var 2 回読みは無視できる                  |
| Path   | Cold: ユーザー目に見える効果ゼロでキャッシュは複雑度を増すだけ |

## TC (reviewer-coverage)

### REPORT

```rust
// src/auth.rs - public API, no test for invalid token path
pub fn verify_token(token: &str) -> Result<Claims, AuthError> {
    let decoded = decode(token, &KEY, &Validation::default())?;
    if decoded.claims.exp < now() {
        return Err(AuthError::Expired);
    }
    Ok(decoded.claims)
}
```

| Field       | Value                                                      |
| ----------- | ---------------------------------------------------------- |
| Filter      | Harm Test pass: 具体トリガー付きセキュリティリグレッション |
| Trigger     | expiry チェックがリグレッション                            |
| Impact      | 無効 token が静かに通る; auth bypass                       |
| Criticality | 9/10: public API, 認証境界                                 |

### SKIP

```rust
// src/internal/normalize.rs - private helper
fn normalize_whitespace(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

// tested indirectly via:
// tests/chunker_test.rs::test_chunk_normalizes_input
// tests/chunker_test.rs::test_chunk_preserves_newlines
```

| Field  | Value                                                                            |
| ------ | -------------------------------------------------------------------------------- |
| Filter | Context Test: indirect coverage                                                  |
| Signal | 2 つの chunker テストがこの helper を介して観測可能挙動を検査済み                |
| Note   | ここの単体テストは `split_whitespace` をテストするだけで、アプリロジックではない |

## DRY (reviewer-duplication)

### REPORT

```typescript
// src/api/users.ts
async function getUser(id: string) {
  const db = await getConnection();
  const user = await db.query("SELECT * FROM users WHERE id = ?", [id]);
  if (!user) throw new NotFoundError("User not found");
  return user;
}

// src/api/teams.ts - same error handling pattern, same structure
async function getTeam(id: string) {
  const db = await getConnection();
  const team = await db.query("SELECT * FROM teams WHERE id = ?", [id]);
  if (!team) throw new NotFoundError("Team not found");
  return team;
}
// (also in orders.ts, projects.ts - 4 occurrences)
```

| Field   | Value                                                            |
| ------- | ---------------------------------------------------------------- |
| Filter  | Harm Test pass: 協調更新リスク                                   |
| Trigger | エラーハンドリング変更 (例: ロギング追加やカスタム error 型導入) |
| Impact  | 同一 4 箇所を更新必要; 1 つでも漏れると挙動が不一致になる        |
| Count   | 4 occurrences: Rule of Three の閾値超過                          |

### SKIP

```typescript
// src/api/users.ts
async function createUser(data: CreateUserInput) {
  validate(data);
  const user = await db.insert("users", { ...data, role: "member" });
  await sendWelcomeEmail(user.email);
  return user;
}

// src/api/teams.ts - similar structure, different business logic
async function createTeam(data: CreateTeamInput) {
  validate(data);
  const team = await db.insert("teams", { ...data, plan: "free" });
  await notifyAdmins(team.name);
  return team;
}
```

| Field  | Value                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------- |
| Filter | Context Test: 意味的差異                                                                                            |
| Signal | ドメイン固有のデフォルト (`role: "member"` vs `plan: "free"`) と side effect (`sendWelcomeEmail` vs `notifyAdmins`) |
| Count  | 2 occurrences: Rule of Three 抽出緊急性以下                                                                         |

## SF (reviewer-silence)

### REPORT

```rust
fn sync_messages(&self, channel: &str) -> Result<usize> {
    match self.client.fetch_history(channel) {
        Ok(messages) => self.store(messages),
        Err(_) => Ok(0),  // caller sees "0 messages synced" - no error signal
    }
}
```

| Field   | Value                                                              |
| ------- | ------------------------------------------------------------------ |
| Filter  | Harm Test pass: 具体的失敗シナリオが存在                           |
| Trigger | Slack API でネットワークエラー、auth 失敗、rate limit              |
| Impact  | caller は `Ok(0)` を見て「0 件同期」と「API ダウン」を区別できない |

### SKIP

```rust
fn load_config(path: &Path) -> Config {
    match fs::read_to_string(path) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => Config::default(),  // first run - config file doesn't exist yet
    }
}
```

| Field  | Value                                                                |
| ------ | -------------------------------------------------------------------- |
| Filter | Context Test: 意図的 fallback                                        |
| Signal | 関数名 `load_config` (`require_config` ではない)、`default()` を返す |
| Path   | Cold: 起動時 1 回実行                                                |

## SEC (reviewer-security)

### REPORT

```typescript
app.get("/users", async (req, res) => {
  const sort = req.query.sort;
  const users = await db.query(`SELECT * FROM users ORDER BY ${sort}`);
  res.json(users);
});
```

| Field   | Value                                    |
| ------- | ---------------------------------------- |
| Filter  | Harm Test pass: 悪用可能な SQL injection |
| Trigger | `?sort=1; DROP TABLE users--`            |
| Impact  | 任意 SQL 実行; DB 全体侵害               |

### SKIP

```typescript
const ALLOWED_SORTS = ["name", "created_at", "email"] as const;

app.get("/users", async (req, res) => {
  const sort = ALLOWED_SORTS.includes(req.query.sort) ? req.query.sort : "name";
  const users = await db.query(`SELECT * FROM users ORDER BY ${sort}`);
  res.json(users);
});
```

| Field  | Value                                                             |
| ------ | ----------------------------------------------------------------- |
| Filter | Context Test: allowlist による検証                                |
| Signal | `ALLOWED_SORTS.includes()` が補間前にユーザー入力をゲートしている |

## TS (reviewer-strictness)

### REPORT

```typescript
async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  const data = await res.json();
  return data as User;  // no runtime validation
}
```

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Filter  | Harm Test pass: 検証なしの外部境界                     |
| Trigger | API が予期しない形を返す (フィールド改名、null 追加)   |
| Impact  | アサート位置から離れたランタイムクラッシュ; debug 困難 |

### SKIP

```typescript
const schema = z.object({ name: z.string(), email: z.string().email() });

function parseUser(raw: unknown): User {
  const parsed = schema.parse(raw);
  return parsed as User;  // Zod already validated; type narrowing
}
```

| Field  | Value                                               |
| ------ | --------------------------------------------------- |
| Filter | Context Test: 検証済み入力                          |
| Signal | `schema.parse()` がアサート前にランタイム保証を提供 |

## TD (reviewer-encapsulation)

### REPORT

```rust
pub struct Order {
    pub items: Vec<Item>,
    pub total: f64,      // must equal sum of items - not enforced
    pub status: String,  // "pending" | "paid" | "shipped" - not enforced
}
```

| Field   | Value                                                            |
| ------- | ---------------------------------------------------------------- |
| Filter  | Harm Test pass: 不正状態が構築可能                               |
| Trigger | `Order { items: vec![], total: 999.0, status: "banana".into() }` |
| Impact  | total 不一致や不正 status からビジネスロジックバグ               |

### SKIP

```rust
pub struct Point {
    pub x: f64,
    pub y: f64,
}
```

| Field  | Value                                                 |
| ------ | ----------------------------------------------------- |
| Filter | Context Test: 強制すべき不変条件なし                  |
| Signal | (x, y) はどんな組合せも有効; encapsulation は価値ゼロ |

## DP (reviewer-design)

### REPORT

```tsx
function OrderPage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("date");

  useEffect(() => { fetch("/api/orders").then(r => r.json()).then(setOrders); }, []);

  const filtered = orders.filter(o => o.name.includes(filter));
  const sorted = filtered.sort((a, b) => a[sort] > b[sort] ? 1 : -1);

  return (
    <div>
      <input value={filter} onChange={e => setFilter(e.target.value)} />
      <select value={sort} onChange={e => setSort(e.target.value)}>
        <option value="date">Date</option>
        <option value="name">Name</option>
      </select>
      {sorted.map(o => (
        <div key={o.id}>
          <h3>{o.name}</h3>
          <p>{o.total}</p>
          {/* ...30 more lines of rendering */}
        </div>
      ))}
    </div>
  );
}
```

| Field   | Value                                                          |
| ------- | -------------------------------------------------------------- |
| Filter  | Harm Test pass: fetch + filter + sort + render を 1 箇所に集約 |
| Trigger | 新規フィルタ種類追加でレンダリングコード変更が必要             |
| Impact  | テスト不能ロジック; render と state が結合; 際限なく成長       |

### SKIP

```tsx
function UserAvatar({ name, src }: { name: string; src: string }) {
  const initials = name.split(" ").map(n => n[0]).join("");
  return <img src={src} alt={initials} onError={e => (e.target.textContent = initials)} />;
}
```

| Field  | Value                                                          |
| ------ | -------------------------------------------------------------- |
| Filter | Context Test: 単一責務、leaf component                         |
| Signal | `initials` 導出は些末; hook 抽出はオーバーヘッドにしかならない |

## TEST (reviewer-testability)

### REPORT

```typescript
function sendReport() {
  const now = Date.now();
  const data = collectMetrics();
  fetch("/api/reports", { method: "POST", body: JSON.stringify({ ...data, ts: now }) });
  console.log(`Report sent at ${new Date(now).toISOString()}`);
}
```

| Field   | Value                                                              |
| ------- | ------------------------------------------------------------------ |
| Filter  | Harm Test pass: テストで制御できない隠れた global 3 つ             |
| Trigger | timestamp、HTTP 呼び出し、ロギングのテストは global の mock が必要 |
| Impact  | テストが flaky (時間依存) または複雑なセットアップが必要           |

### SKIP

```typescript
function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "JPY" }).format(amount);
}
```

| Field  | Value                                                   |
| ------ | ------------------------------------------------------- |
| Filter | Context Test: 純粋関数、隠れた依存なし                  |
| Signal | `Intl.NumberFormat` は決定的; input/output でテスト可能 |

## PERF (reviewer-performance)

### REPORT

```tsx
function ChatList({ messages }: { messages: Message[] }) {
  return (
    <ul>
      {messages.map(msg => (
        <ChatBubble
          key={msg.id}
          message={msg}
          onReply={() => handleReply(msg.id)}  // new function every render
          style={{ padding: msg.isOwn ? 10 : 20 }}  // new object every render
        />
      ))}
    </ul>
  );
}
```

| Field   | Value                                                         |
| ------- | ------------------------------------------------------------- |
| Filter  | Harm Test pass: 親 render ごとに N 個の子 re-render           |
| Trigger | 親の任意 state 変更; 100+ アイテムのリスト                    |
| Impact  | inline arrow + inline object が全子の `React.memo` を破壊する |

### SKIP

```tsx
function SettingsToggle({ label, checked, onChange }: Props) {
  return (
    <label>
      {label}
      <input type="checkbox" checked={checked} onChange={() => onChange(!checked)} />
    </label>
  );
}
```

| Field  | Value                                                            |
| ------ | ---------------------------------------------------------------- |
| Filter | Context Test: leaf component、re-render する子なし               |
| Signal | leaf の inline arrow; メモ化しても (subtree なし) 何も得られない |

## PE (reviewer-progressive)

### REPORT

```javascript
window.addEventListener("resize", () => {
  if (window.innerWidth < 768) {
    sidebar.style.display = "none";
  } else {
    sidebar.style.display = "block";
  }
});
```

| Field   | Value                                                                                   |
| ------- | --------------------------------------------------------------------------------------- |
| Filter  | Harm Test pass: CSS media query で完全代替可能                                          |
| Trigger | window resize ごとに JS handler が発火                                                  |
| Impact  | `@media (max-width: 768px) { .sidebar { display: none } }`: JS ゼロでパフォーマンス向上 |

### SKIP

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadMoreItems();
      observer.unobserve(entry.target);
    }
  });
});
observer.observe(sentinelRef.current);
```

| Field  | Value                                                             |
| ------ | ----------------------------------------------------------------- |
| Filter | Context Test: スクロール時のデータ取得に CSS 等価物なし           |
| Signal | IntersectionObserver が API 呼び出しをトリガ; CSS では fetch 不可 |

## OPS (reviewer-operations)

### REPORT

```tsx
function DashboardPage() {
  const { data } = useSWR("/api/dashboard", fetcher);  // can throw
  return (
    <main>
      <h1>Dashboard</h1>
      <RevenueChart data={data.revenue} />
      <OrderTable data={data.orders} />
    </main>
  );
}
```

| Field   | Value                                                     |
| ------- | --------------------------------------------------------- |
| Filter  | Harm Test pass: page レベルでエラー封じ込めなし           |
| Trigger | API がエラーまたは予期しない shape を返す                 |
| Impact  | ページ全体が white-screen; ユーザーに React error overlay |

### SKIP

```tsx
function PriceTag({ amount }: { amount: number }) {
  return <span>{formatCurrency(amount)}</span>;
}
```

| Field  | Value                                             |
| ------ | ------------------------------------------------- |
| Filter | Context Test: 内部 presentational、親がエラー処理 |
| Signal | async なし、副作用なし; 親 ErrorBoundary がカバー |

## RC (reviewer-causation)

### REPORT

```typescript
// "Fix: add retry on save failure"
async function saveOrder(order: Order) {
  try {
    await db.save(order);
  } catch {
    await sleep(500);
    await db.save(order);  // retry hides the real problem
  }
}
```

| Field   | Value                                                                  |
| ------- | ---------------------------------------------------------------------- |
| Filter  | Harm Test pass: 原因を理解しない retry                                 |
| Trigger | コネクションプール枯渇または制約違反                                   |
| Impact  | 失敗中 DB に二重負荷; 根本原因 (プールサイズや検証ギャップ) を覆い隠す |

### SKIP

```typescript
// Intentional retry for transient network errors
async function fetchExternalRate(currency: string): Promise<number> {
  return retry(() => fetch(`https://api.rates.com/${currency}`), {
    retries: 3,
    delay: 1000,
    retryOn: [503, 429],  // only transient errors
  });
}
```

| Field  | Value                                                          |
| ------ | -------------------------------------------------------------- |
| Filter | Context Test: 既知の transient error に対する意図的 resilience |
| Signal | 特定 HTTP status code に限定; 外部依存                         |

## REUSE (reviewer-reuse)

### REPORT

```typescript
// src/features/billing/validate.ts - new code
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// src/shared/validation.ts - already exists in codebase
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

| Field   | Value                                              |
| ------- | -------------------------------------------------- |
| Filter  | Harm Test pass: 同一ロジックの再実装               |
| Trigger | email 検証ルール変更 (例: + alias 許可)            |
| Impact  | 一方を更新してもう一方を忘れる; 検証が不整合になる |

### SKIP

```typescript
// src/features/billing/validate.ts - new code
function validateInvoiceDate(date: Date, billingCycle: BillingCycle): boolean {
  const cycleStart = billingCycle.startDate;
  const grace = billingCycle.gracePeriodDays;
  return date >= cycleStart && date <= addDays(cycleStart, grace);
}
```

| Field  | Value                                              |
| ------ | -------------------------------------------------- |
| Filter | Context Test: 既存等価物のないドメイン特化ロジック |
| Signal | billing cycle 検証はこの機能固有                   |

## DOC (reviewer-document)

### REPORT

```markdown
## Installation

Install globally: $ npm install -g myapp
```

| Field   | Value                                                    |
| ------- | -------------------------------------------------------- |
| Filter  | Harm Test pass: 古い手順がユーザー失敗を招く             |
| Trigger | ユーザーが非推奨の global install に従う; npx 利用と衝突 |
| Impact  | 初回セットアップ失敗; ユーザー離脱                       |

### SKIP

```markdown
## Architecture

The system uses a pipeline pattern where each stage transforms the input and passes it to the next stage.
```

| Field  | Value                                              |
| ------ | -------------------------------------------------- |
| Filter | Context Test: 正確な散文、好みの問題で欠陥ではない |
| Signal | 内容は正確; diagram 追加は改善で fix ではない      |

## PQ (reviewer-prompt)

### REPORT

```markdown
When you encounter a situation where the user has provided input that needs to be validated, you should first check whether the input conforms to the expected format.
If it does not conform, you should return an appropriate error message.
If it does conform, you should proceed with processing the input according to the rules defined below.
```

| Field   | Value                                      |
| ------- | ------------------------------------------ |
| Filter  | Harm Test pass: 4 行の散文 = 1 表行        |
| Trigger | LLM が 2 列ルールに ~60 トークンを処理する |
| Impact  | 等価な 2 列表行で 50+ トークン削減         |

### SKIP

```markdown
This reviewer detects silent failures - errors that are caught but not surfaced to the user or logged for operators.
```

| Field  | Value                                                  |
| ------ | ------------------------------------------------------ |
| Filter | Context Test: 詳細な表の前の 2 行イントロ              |
| Signal | 簡潔なコンテキスト設定散文; 表に変えても何も得られない |

## A11Y (reviewer-accessibility)

### REPORT

```tsx
function Dropdown({ items, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div onClick={() => setOpen(!open)}>Select...</div>
      {open && (
        <ul>
          {items.map(item => (
            <li key={item.id} onClick={() => onSelect(item)}>{item.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

| Field   | Value                                                                  |
| ------- | ---------------------------------------------------------------------- |
| Filter  | Harm Test pass: キーボードと screen reader でアクセス不可              |
| Trigger | Tab key で dropdown を skip; screen reader が "listbox" でなく "group" |
| Impact  | WCAG 2.1.1 (Keyboard), 4.1.2 (Name, Role, Value) 違反                  |

### SKIP

```tsx
function SubmitButton({ onClick, children }: Props) {
  return <button type="submit" onClick={onClick}>{children}</button>;
}
```

| Field  | Value                                                  |
| ------ | ------------------------------------------------------ |
| Filter | Context Test: ネイティブ要素が組み込み a11y を提供     |
| Signal | `<button>` はデフォルトで keyboard, focus, role を持つ |

## CHX (reviewer-resilience)

### REPORT

```rust
// src/sync/slack.rs - external API call without resilience controls
async fn fetch_messages(&self, channel: &str) -> Result<Vec<Message>> {
    let response = self.client
        .get(&format!("{}/conversations.history", self.base))
        .send()
        .await?;
    Ok(response.json().await?)
}
```

| Field        | Value                                                           |
| ------------ | --------------------------------------------------------------- |
| Filter       | Harm Test pass: timeout/retry/circuit breaker なしの外部 API    |
| Trigger      | Slack API レイテンシ > 30s、network partition、rate limit (429) |
| Failure      | caller が無期限ハング; sync pipeline 全体がブロック             |
| Blast radius | service-wide (`fetch_messages` の全 caller がブロック)          |
| Hypothesis   | 明示 timeout なしで TCP socket は OS デフォルト (~2min) を待つ  |

### SKIP

```rust
fn clamp(value: i32, min: i32, max: i32) -> i32 {
    value.max(min).min(max)
}
```

| Field  | Value                                           |
| ------ | ----------------------------------------------- |
| Filter | Context Test: 純粋関数、failure mode なし       |
| Signal | 決定的、I/O なし、共有状態なし、retry path 不要 |
