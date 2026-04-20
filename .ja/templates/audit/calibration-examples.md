# Calibration 例

監査レビュアー向けのドメイン固有 REPORT/SKIP 例。各レビュアーがこのファイルを
参照する。原則は `finding-schema.md` を参照。

## 出典

以下の例は実際の audit FP パターンから手作成。拡充・検証には外部ベンチマークを使用:

| Dataset                       | 用途                                                    |
| ----------------------------- | ------------------------------------------------------- |
| Qodo Code Review Benchmark 1.0 | 実 PR の欠陥注入。ground truth（TP/FP）付き            |
| CodeReviewQA (HuggingFace)    | 9 言語 900 件のキュレーション済みレビューインタラクション |
| Suppressed SAST Warnings      | 開発者が抑制した 1,873 件の警告 = SKIP ケース           |
| OWASP Benchmark               | セキュリティ特化の FP/TP 評価                           |
| Greptile AI Review Benchmark  | 50 件の実 PR での AI レビューノイズ率                   |

## CQ (code-quality-reviewer)

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

| Field   | Value                                          |
| ------- | ---------------------------------------------- |
| Filter  | Senior Engineer Test pass — 変更を求める       |
| Trigger | この関数を読むすべての開発者                   |
| Impact  | ネスト 5 段 + 引数 6 個 + 1 文字変数 = 読めない |

### SKIP

```typescript
function createUser(name: string, email: string): User {
  const normalized = email.toLowerCase().trim();
  const user = { id: generateId(), name, email: normalized, createdAt: new Date() };
  return user;
}
```

| Field  | Value                                                                   |
| ------ | ----------------------------------------------------------------------- |
| Filter | Senior Engineer Test fail — 好みの問題であり欠陥ではない                |
| Signal | `normalized` と `user` は可読性に貢献。インライン化で明瞭さは向上しない |

---

## EFF (efficiency-reviewer)

### REPORT

```rust
fn search(&self, query: &str) -> Vec<Result> {
    let db = Connection::open(&self.db_path).unwrap();  // opens on every call
    let embedding = self.embed(query);
    db.query("SELECT * FROM chunks ORDER BY distance(?, embedding)", [embedding])
}
```

| Field   | Value                                                       |
| ------- | ----------------------------------------------------------- |
| Filter  | Harm Test pass — ホットパスで計測可能な無駄                 |
| Trigger | ユーザーの検索呼び出しごと                                  |
| Impact  | プール再利用の代わりに毎回 DB 接続を開く。レイテンシ + リーク |
| Path    | Hot — ユーザー向け関数                                      |

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

| Field  | Value                                                     |
| ------ | --------------------------------------------------------- |
| Filter | Context Test: コールドパス                                |
| Signal | 起動時に 1 回だけ実行。環境変数 2 回読み込みは無視できる  |
| Path   | Cold — キャッシュ追加は複雑さに対してユーザー体感ゼロの改善 |

---

## TC (test-coverage-reviewer)

### REPORT

```rust
// src/auth.rs — public API, no test for invalid token path
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
| Filter      | Harm Test pass — セキュリティリグレッションの具体的 trigger |
| Trigger     | 期限チェックがリグレッション                               |
| Impact      | 無効なトークンがサイレントに通過。認証バイパス             |
| Criticality | 9/10 — public API、認証境界                                |

### SKIP

```rust
// src/internal/normalize.rs — private helper
fn normalize_whitespace(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

// tested indirectly via:
// tests/chunker_test.rs::test_chunk_normalizes_input
// tests/chunker_test.rs::test_chunk_preserves_newlines
```

| Field  | Value                                                                                  |
| ------ | -------------------------------------------------------------------------------------- |
| Filter | Context Test: 間接カバー                                                               |
| Signal | chunker テスト 2 件がこのヘルパーを経由して観測可能な動作を検証済み                    |
| Note   | この関数の単体テストは `split_whitespace` のテストであり、アプリロジックのテストではない |

---

## DRY (duplication-reviewer)

### REPORT

```typescript
// src/api/users.ts
async function getUser(id: string) {
  const db = await getConnection();
  const user = await db.query("SELECT * FROM users WHERE id = ?", [id]);
  if (!user) throw new NotFoundError("User not found");
  return user;
}

// src/api/teams.ts — same error handling pattern, same structure
async function getTeam(id: string) {
  const db = await getConnection();
  const team = await db.query("SELECT * FROM teams WHERE id = ?", [id]);
  if (!team) throw new NotFoundError("Team not found");
  return team;
}
// (also in orders.ts, projects.ts — 4 occurrences)
```

| Field   | Value                                                          |
| ------- | -------------------------------------------------------------- |
| Filter  | Harm Test pass — 協調更新リスク                                |
| Trigger | エラーハンドリング変更（ログ追加、カスタムエラー型など）       |
| Impact  | 4 箇所の同一コールサイトを更新必要。1 箇所漏れ = 不整合        |
| Count   | 4 箇所 — Rule of Three 閾値超過                                |

### SKIP

```typescript
// src/api/users.ts
async function createUser(data: CreateUserInput) {
  validate(data);
  const user = await db.insert("users", { ...data, role: "member" });
  await sendWelcomeEmail(user.email);
  return user;
}

// src/api/teams.ts — similar structure, different business logic
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
| Signal | ドメイン固有のデフォルト値（`role: "member"` vs `plan: "free"`）と副作用（`sendWelcomeEmail` vs `notifyAdmins`） |
| Count  | 2 箇所 — Rule of Three の抽出緊急度閾値未満                                                                         |

---

## SF (silent-failure-reviewer)

### REPORT

```rust
fn sync_messages(&self, channel: &str) -> Result<usize> {
    match self.client.fetch_history(channel) {
        Ok(messages) => self.store(messages),
        Err(_) => Ok(0),  // caller sees "0 messages synced" — no error signal
    }
}
```

| Field   | Value                                                                                       |
| ------- | ------------------------------------------------------------------------------------------- |
| Filter  | Harm Test pass — 具体的な障害シナリオあり                                                   |
| Trigger | Slack API のネットワークエラー、認証失敗、レート制限                                         |
| Impact  | 呼び出し元は `Ok(0)` を受け取り、「メッセージなし」と「API ダウン」を区別できない          |

### SKIP

```rust
fn load_config(path: &Path) -> Config {
    match fs::read_to_string(path) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => Config::default(),  // first run — config file doesn't exist yet
    }
}
```

| Field  | Value                                                                    |
| ------ | ------------------------------------------------------------------------ |
| Filter | Context Test: 意図的フォールバック                                       |
| Signal | 関数名 `load_config`（`require_config` ではない）、`default()` の戻り値 |
| Path   | Cold — 起動時に 1 回だけ実行                                             |

---

## SEC (security-reviewer)

### REPORT

```typescript
app.get("/users", async (req, res) => {
  const sort = req.query.sort;
  const users = await db.query(`SELECT * FROM users ORDER BY ${sort}`);
  res.json(users);
});
```

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Filter  | Harm Test pass — 悪用可能な SQL インジェクション       |
| Trigger | `?sort=1; DROP TABLE users--`                          |
| Impact  | 任意 SQL 実行; データベース全体の侵害                  |

### SKIP

```typescript
const ALLOWED_SORTS = ["name", "created_at", "email"] as const;

app.get("/users", async (req, res) => {
  const sort = ALLOWED_SORTS.includes(req.query.sort) ? req.query.sort : "name";
  const users = await db.query(`SELECT * FROM users ORDER BY ${sort}`);
  res.json(users);
});
```

| Field  | Value                                                            |
| ------ | ---------------------------------------------------------------- |
| Filter | Context Test: allowlist 検証                                     |
| Signal | `ALLOWED_SORTS.includes()` が補間前にユーザー入力をゲートしている |

---

## TS (type-safety-reviewer)

### REPORT

```typescript
async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  const data = await res.json();
  return data as User;  // no runtime validation
}
```

| Field   | Value                                                       |
| ------- | ----------------------------------------------------------- |
| Filter  | Harm Test pass — 検証なしの外部境界                         |
| Trigger | API が想定外の形を返す（フィールド改名、null 追加）         |
| Impact  | アサーション箇所から遠い場所でランタイムクラッシュ; デバッグ困難 |

### SKIP

```typescript
const schema = z.object({ name: z.string(), email: z.string().email() });

function parseUser(raw: unknown): User {
  const parsed = schema.parse(raw);
  return parsed as User;  // Zod already validated; type narrowing
}
```

| Field  | Value                                                          |
| ------ | -------------------------------------------------------------- |
| Filter | Context Test: 検証済み入力                                     |
| Signal | `schema.parse()` がアサーション前にランタイム保証を提供している |

---

## TD (type-design-reviewer)

### REPORT

```rust
pub struct Order {
    pub items: Vec<Item>,
    pub total: f64,      // must equal sum of items — not enforced
    pub status: String,  // "pending" | "paid" | "shipped" — not enforced
}
```

| Field   | Value                                                             |
| ------- | ----------------------------------------------------------------- |
| Filter  | Harm Test pass — 不正な状態が構築可能                             |
| Trigger | `Order { items: vec![], total: 999.0, status: "banana".into() }` |
| Impact  | total 不整合や無効な status によるビジネスロジックバグ            |

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
| Signal | 任意の (x, y) 組み合わせが有効; カプセル化による価値なし |

---

## DP (design-pattern-reviewer)

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
| Filter  | Harm Test pass — fetch + filter + sort + render が 1 箇所に集中 |
| Trigger | 新しいフィルタ種別を追加するたびにレンダリングコード編集が必要 |
| Impact  | テスト不可能なロジック; レンダーと結合した状態; 無制限に拡大    |

### SKIP

```tsx
function UserAvatar({ name, src }: { name: string; src: string }) {
  const initials = name.split(" ").map(n => n[0]).join("");
  return <img src={src} alt={initials} onError={e => (e.target.textContent = initials)} />;
}
```

| Field  | Value                                                        |
| ------ | ------------------------------------------------------------ |
| Filter | Context Test: 単一責務、葉コンポーネント                     |
| Signal | `initials` の導出は自明; hook 抽出はオーバーヘッドを増やすだけ |

---

## TEST (testability-reviewer)

### REPORT

```typescript
function sendReport() {
  const now = Date.now();
  const data = collectMetrics();
  fetch("/api/reports", { method: "POST", body: JSON.stringify({ ...data, ts: now }) });
  console.log(`Report sent at ${new Date(now).toISOString()}`);
}
```

| Field   | Value                                                          |
| ------- | -------------------------------------------------------------- |
| Filter  | Harm Test pass — テストで制御不能な隠れグローバル 3 つ         |
| Trigger | timestamp、HTTP 呼び出し、ログのテストにグローバルのモックが必要 |
| Impact  | テストが flaky（時間依存）または複雑なセットアップを要求       |

### SKIP

```typescript
function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "JPY" }).format(amount);
}
```

| Field  | Value                                                           |
| ------ | --------------------------------------------------------------- |
| Filter | Context Test: 純粋関数、隠れた依存なし                          |
| Signal | `Intl.NumberFormat` は決定論的; input/output でテスト可能       |

---

## PERF (performance-reviewer)

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

| Field   | Value                                                                      |
| ------- | -------------------------------------------------------------------------- |
| Filter  | Harm Test pass — 親レンダーごとに N 個の子が再レンダー                     |
| Trigger | 親の state 変更; 100+ items のリスト                                       |
| Impact  | inline arrow + inline object で `React.memo` が毎回子で破綻               |

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

| Field  | Value                                                              |
| ------ | ------------------------------------------------------------------ |
| Filter | Context Test: 葉コンポーネント、再レンダーする子なし               |
| Signal | 葉の inline arrow; メモ化しても何も節約できない（subtree なし）    |

---

## PE (progressive-enhancer)

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

| Field   | Value                                                                                    |
| ------- | ---------------------------------------------------------------------------------------- |
| Filter  | Harm Test pass — CSS media query で完全に置き換え可能                                    |
| Trigger | ウィンドウリサイズのたびに JS ハンドラ発火                                               |
| Impact  | `@media (max-width: 768px) { .sidebar { display: none } }` — JS ゼロ、パフォーマンス改善 |

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
| Filter | Context Test: スクロール時データ取得に CSS 代替なし               |
| Signal | IntersectionObserver が API 呼び出しをトリガー; CSS はデータ取得不可 |

---

## OPS (operational-readiness-reviewer)

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

| Field   | Value                                                       |
| ------- | ----------------------------------------------------------- |
| Filter  | Harm Test pass — ページレベルでエラーコンテインメントなし   |
| Trigger | API がエラーを返すか想定外の形を返す                        |
| Impact  | ページ全体がホワイトアウト; ユーザーに React エラー画面表示 |

### SKIP

```tsx
function PriceTag({ amount }: { amount: number }) {
  return <span>{formatCurrency(amount)}</span>;
}
```

| Field  | Value                                                                  |
| ------ | ---------------------------------------------------------------------- |
| Filter | Context Test: 内部 Presentational、親がエラーを処理                    |
| Signal | async なし、副作用なし; 親の ErrorBoundary がカバー                    |

---

## RCA (root-cause-reviewer)

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

| Field   | Value                                                                    |
| ------- | ------------------------------------------------------------------------ |
| Filter  | Harm Test pass — 原因を理解せずに retry                                  |
| Trigger | 接続プール枯渇または制約違反                                             |
| Impact  | 失敗中 DB の負荷が倍増; 根本原因（プールサイズや検証不足）を隠す        |

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

| Field  | Value                                                           |
| ------ | --------------------------------------------------------------- |
| Filter | Context Test: 既知の一時的エラーに対する意図的な回復処理        |
| Signal | 特定の HTTP status code に限定; 外部依存                        |

---

## REUSE (reuse-reviewer)

### REPORT

```typescript
// src/features/billing/validate.ts — new code
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// src/shared/validation.ts — already exists in codebase
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

| Field   | Value                                                    |
| ------- | -------------------------------------------------------- |
| Filter  | Harm Test pass — 同一ロジックの再実装                    |
| Trigger | メール検証ルール変更（例: `+` エイリアス許可）           |
| Impact  | 片方だけ更新して忘れる; 検証の不整合                     |

### SKIP

```typescript
// src/features/billing/validate.ts — new code
function validateInvoiceDate(date: Date, billingCycle: BillingCycle): boolean {
  const cycleStart = billingCycle.startDate;
  const grace = billingCycle.gracePeriodDays;
  return date >= cycleStart && date <= addDays(cycleStart, grace);
}
```

| Field  | Value                                                            |
| ------ | ---------------------------------------------------------------- |
| Filter | Context Test: 既存同等品なしのドメイン固有ロジック               |
| Signal | 請求サイクル検証はこの機能固有                                   |

---

## DOC (document-reviewer)

### REPORT

```markdown
## Installation

Install globally:
$ npm install -g myapp
```

| Field   | Value                                                                    |
| ------- | ------------------------------------------------------------------------ |
| Filter  | Harm Test pass — 時代遅れの手順でユーザーが失敗                          |
| Trigger | ユーザーが非推奨のグローバルインストールに従う; npx 使用と衝突           |
| Impact  | 初回セットアップ失敗; ユーザーが離脱                                     |

### SKIP

```markdown
## Architecture

The system uses a pipeline pattern where each stage
transforms the input and passes it to the next stage.
```

| Field  | Value                                                          |
| ------ | -------------------------------------------------------------- |
| Filter | Context Test: 正確な散文、スタイルの好みで欠陥ではない         |
| Signal | 内容は正しい; 図を追加するのは改善であって修正ではない         |

---

## PQ (prompt-reviewer)

### REPORT

```markdown
When you encounter a situation where the user has provided input that
needs to be validated, you should first check whether the input conforms
to the expected format. If it does not conform, you should return an
appropriate error message. If it does conform, you should proceed with
processing the input according to the rules defined below.
```

| Field   | Value                                                           |
| ------- | --------------------------------------------------------------- |
| Filter  | Harm Test pass — 4 行の散文 = テーブル 1 行                     |
| Trigger | 2 列のルールに LLM が ~60 トークン消費                          |
| Impact  | `\| invalid input \| return error \|` で 50+ トークン節約       |

### SKIP

```markdown
This reviewer detects silent failures — errors that are caught but
not surfaced to the user or logged for operators.
```

| Field  | Value                                                                |
| ------ | -------------------------------------------------------------------- |
| Filter | Context Test: 詳細テーブルの前の 2 行の導入                          |
| Signal | 簡潔な文脈設定散文; テーブル化しても価値なし                         |

---

## A11Y (accessibility-reviewer)

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

| Field   | Value                                                                    |
| ------- | ------------------------------------------------------------------------ |
| Filter  | Harm Test pass — キーボードとスクリーンリーダーでアクセス不能            |
| Trigger | Tab キーが dropdown をスキップ; スクリーンリーダーが "group" と読み "listbox" と読まない |
| Impact  | WCAG 2.1.1 (Keyboard)、4.1.2 (Name, Role, Value) の不合格               |

### SKIP

```tsx
function SubmitButton({ onClick, children }: Props) {
  return <button type="submit" onClick={onClick}>{children}</button>;
}
```

| Field  | Value                                                              |
| ------ | ------------------------------------------------------------------ |
| Filter | Context Test: ネイティブ要素が built-in a11y を提供                |
| Signal | `<button>` はデフォルトで keyboard、focus、role を持つ             |

---

## SOW/Spec (sow-spec-reviewer)

### Spec — FR EARS 違反

#### REPORT

```markdown
### FR-001: Order Processing
The system processes orders and updates the database accordingly.
```

| Field   | Value                                                            |
| ------- | ---------------------------------------------------------------- |
| Filter  | Harm Test pass — SHALL なし、EARS パターンなし、実装不可         |
| Trigger | CC が構築すべき動作を決定できない — エスカレートする             |
| Impact  | 2 × P0 blocker (SHALL 欠落 + EARS パターンなし) → NotReady       |

#### SKIP

```markdown
## Background
The current order processing system was built in 2019 and handles
approximately 500 orders per day. Peak load occurs during lunch hours.
```

| Field  | Value                                                               |
| ------ | ------------------------------------------------------------------- |
| Filter | Context Test: Background セクション、要件ではない                   |
| Signal | Background の散文; SHALL/EARS は FR にのみ適用                      |

### SOW — AC Observable signal

#### REPORT

```markdown
### AC-1: User Registration

| # | Criterion                | Observable signal            |
| - | ------------------------ | ---------------------------- |
| 1 | ユーザー登録ができる     | ユーザーが正しく登録される   |
```

| Field   | Value                                                                |
| ------- | -------------------------------------------------------------------- |
| Filter  | Harm Test pass — 「正しく登録」が観察不可能; Spec FR がブロックされる |
| Trigger | CC が AC からテストを書けない — エスカレートする                     |
| Impact  | AC 列の完全性で P0 blocker → NotReady                                |

#### SKIP

```markdown
### AC-1: User Registration

| # | Criterion                | Observable signal                                |
| - | ------------------------ | ------------------------------------------------ |
| 1 | ユーザー登録ができる     | POST /api/v1/users returns 201 + Location header |
```

| Field  | Value                                                                   |
| ------ | ----------------------------------------------------------------------- |
| Filter | Context Test: observable signal が具体的な HTTP アサーション            |
| Signal | テスト作成者が `expect(res.status).toBe(201)` をすぐに書ける            |

### SOW — Scope integrity overlap

#### REPORT

```markdown
### In Scope
| Target              | Change            | Observable outcome         | Files |
| ------------------- | ----------------- | -------------------------- | ----- |
| auth middleware     | replace with JWT  | /login returns JWT         | 3     |

### Out of Scope
| Exclusion           | Why not                                       |
| ------------------- | --------------------------------------------- |
| auth middleware     | Session cookies retained in legacy paths     |
```

| Field   | Value                                                                   |
| ------- | ----------------------------------------------------------------------- |
| Filter  | Harm Test pass — 同じ対象が In Scope と Out of Scope の両方に列挙される |
| Trigger | CC がどのパスを触るべきか決定できない; Spec 生成が破綻                  |
| Impact  | P0 blocker (Scope Integrity) → NotReady                                 |

#### SKIP

```markdown
### In Scope
| Target           | Change           |
| ---------------- | ---------------- |
| login endpoint   | accept JWT       |

### Out of Scope
| Exclusion               | Why not                     |
| ----------------------- | --------------------------- |
| session token migration | Follow-up feature           |
```

| Field  | Value                                                                  |
| ------ | ---------------------------------------------------------------------- |
| Filter | Context Test: In Scope と Out of Scope が別対象を参照                  |
| Signal | "login endpoint" ≠ "session token migration"; 重複なし                 |

### SOW — HIGH impact リスクの Mitigation ギャップ

#### REPORT

```markdown
| Risk                 | Impact | Probability | Mitigation |
| -------------------- | ------ | ----------- | ---------- |
| DB migration failure | HIGH   | MED         |            |
```

| Field   | Value                                                                 |
| ------- | --------------------------------------------------------------------- |
| Filter  | Harm Test pass — HIGH impact リスクに具体的な mitigation なし         |
| Trigger | リスクが顕在化しても CC に計画された対応がない                        |
| Impact  | P0 blocker (Risks Completeness) → NotReady                            |

#### SKIP

```markdown
| Risk                 | Impact | Probability | Mitigation                                       |
| -------------------- | ------ | ----------- | ------------------------------------------------ |
| DB migration failure | HIGH   | MED         | Dry-run on staging; rollback SQL stored in repo |
```

| Field  | Value                                                              |
| ------ | ------------------------------------------------------------------ |
| Filter | Context Test: Mitigation が具体的で実行可能                        |
| Signal | "dry-run" と "rollback SQL" は "monitor" ではなくテスト可能な操作 |
