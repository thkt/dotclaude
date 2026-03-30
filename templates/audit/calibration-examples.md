# Calibration Examples

Domain-specific REPORT/SKIP examples for audit reviewers. Each reviewer
references this file. Principles are in `finding-schema.md`.

## Sources

Examples below are hand-crafted from actual audit FP patterns. For expanding
and validating, use these external benchmarks:

| Dataset                          | Use for                                          |
| -------------------------------- | ------------------------------------------------ |
| Qodo Code Review Benchmark 1.0  | Real PR defects with ground truth (TP/FP)        |
| CodeReviewQA (HuggingFace)      | 900 curated review interactions across 9 langs   |
| Suppressed SAST Warnings        | 1,873 developer-suppressed warnings = SKIP cases |
| OWASP Benchmark                 | Security-specific FP/TP evaluation               |
| Greptile AI Review Benchmark    | AI reviewer noise rate on 50 real PRs            |

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

| Field   | Value                                                     |
| ------- | --------------------------------------------------------- |
| Filter  | Senior Engineer Test pass — would request changes         |
| Trigger | Any reader encountering this function                     |
| Impact  | 5-level nesting + 6 args + single-letter var = unreadable |

### SKIP

```typescript
function createUser(name: string, email: string): User {
  const normalized = email.toLowerCase().trim();
  const user = { id: generateId(), name, email: normalized, createdAt: new Date() };
  return user;
}
```

| Field  | Value                                                              |
| ------ | ------------------------------------------------------------------ |
| Filter | Senior Engineer Test fail — preference, not defect                 |
| Signal | `normalized` and `user` aid readability; inlining saves no clarity |

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

| Field   | Value                                                            |
| ------- | ---------------------------------------------------------------- |
| Filter  | Harm Test pass — measurable waste on hot path                    |
| Trigger | Every user search call                                           |
| Impact  | New DB connection per call instead of pool reuse; latency + leak |
| Path    | Hot — user-facing function                                       |

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
| Signal | Runs once at startup; two env var reads are negligible         |
| Path   | Cold — caching adds complexity for zero user-visible benefit   |

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

| Field       | Value                                                          |
| ----------- | -------------------------------------------------------------- |
| Filter      | Harm Test pass — security regression with concrete trigger     |
| Trigger     | Expiry check regresses                                         |
| Impact      | Invalid tokens pass silently; auth bypass                      |
| Criticality | 9/10 — public API, authentication boundary                     |

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

| Field  | Value                                                                    |
| ------ | ------------------------------------------------------------------------ |
| Filter | Context Test: indirect coverage                                          |
| Signal | Two chunker tests exercise observable behavior through this helper       |
| Note   | Unit test here would test `split_whitespace`, not application logic      |

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

| Field   | Value                                                              |
| ------- | ------------------------------------------------------------------ |
| Filter  | Harm Test pass — coordinated update risk                           |
| Trigger | Error handling change (e.g., add logging or custom error type)     |
| Impact  | Must update 4 identical call sites; miss one = inconsistent behavior |
| Count   | 4 occurrences — above Rule of Three threshold                      |

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

| Field  | Value                                                                   |
| ------ | ----------------------------------------------------------------------- |
| Filter | Context Test: semantic difference                                       |
| Signal | Domain-specific defaults (`role: "member"` vs `plan: "free"`) and side effects (`sendWelcomeEmail` vs `notifyAdmins`) |
| Count  | 2 occurrences — below Rule of Three extraction urgency                  |

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

| Field   | Value                                                              |
| ------- | ------------------------------------------------------------------ |
| Filter  | Harm Test pass — concrete failure scenario exists                  |
| Trigger | Network error, auth failure, or rate limit on Slack API            |
| Impact  | Caller sees `Ok(0)`, cannot distinguish "no messages" from "API down" |

### SKIP

```rust
fn load_config(path: &Path) -> Config {
    match fs::read_to_string(path) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => Config::default(),  // first run — config file doesn't exist yet
    }
}
```

| Field  | Value                                                                  |
| ------ | ---------------------------------------------------------------------- |
| Filter | Context Test: intentional fallback                                     |
| Signal | Function name `load_config` (not `require_config`), `default()` return |
| Path   | Cold — runs once at startup                                            |

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

| Field   | Value                                                            |
| ------- | ---------------------------------------------------------------- |
| Filter  | Harm Test pass — exploitable SQL injection                       |
| Trigger | `?sort=1; DROP TABLE users--`                                    |
| Impact  | Arbitrary SQL execution; full database compromise                |

### SKIP

```typescript
const ALLOWED_SORTS = ["name", "created_at", "email"] as const;

app.get("/users", async (req, res) => {
  const sort = ALLOWED_SORTS.includes(req.query.sort) ? req.query.sort : "name";
  const users = await db.query(`SELECT * FROM users ORDER BY ${sort}`);
  res.json(users);
});
```

| Field  | Value                                                              |
| ------ | ------------------------------------------------------------------ |
| Filter | Context Test: allowlist validation                                 |
| Signal | `ALLOWED_SORTS.includes()` gates user input before interpolation   |

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

| Field   | Value                                                             |
| ------- | ----------------------------------------------------------------- |
| Filter  | Harm Test pass — external boundary without validation             |
| Trigger | API returns unexpected shape (field renamed, null added)          |
| Impact  | Runtime crash far from the assertion site; hard to debug          |

### SKIP

```typescript
const schema = z.object({ name: z.string(), email: z.string().email() });

function parseUser(raw: unknown): User {
  const parsed = schema.parse(raw);
  return parsed as User;  // Zod already validated; type narrowing
}
```

| Field  | Value                                                        |
| ------ | ------------------------------------------------------------ |
| Filter | Context Test: validated input                                |
| Signal | `schema.parse()` provides runtime guarantee before assertion |

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

| Field   | Value                                                               |
| ------- | ------------------------------------------------------------------- |
| Filter  | Harm Test pass — invalid state is constructible                     |
| Trigger | `Order { items: vec![], total: 999.0, status: "banana".into() }`   |
| Impact  | Business logic bugs from inconsistent total or invalid status       |

### SKIP

```rust
pub struct Point {
    pub x: f64,
    pub y: f64,
}
```

| Field  | Value                                                       |
| ------ | ----------------------------------------------------------- |
| Filter | Context Test: no invariants to enforce                      |
| Signal | Any (x, y) combination is valid; encapsulation adds no value |

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

| Field   | Value                                                             |
| ------- | ----------------------------------------------------------------- |
| Filter  | Harm Test pass — fetch + filter + sort + render all in one        |
| Trigger | Adding a new filter type requires editing rendering code          |
| Impact  | Untestable logic; render-coupled state; growing without bound     |

### SKIP

```tsx
function UserAvatar({ name, src }: { name: string; src: string }) {
  const initials = name.split(" ").map(n => n[0]).join("");
  return <img src={src} alt={initials} onError={e => (e.target.textContent = initials)} />;
}
```

| Field  | Value                                                           |
| ------ | --------------------------------------------------------------- |
| Filter | Context Test: single responsibility, leaf component             |
| Signal | Deriving `initials` is trivial; extracting a hook adds overhead |

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

| Field   | Value                                                             |
| ------- | ----------------------------------------------------------------- |
| Filter  | Harm Test pass — 3 hidden globals impossible to control in tests  |
| Trigger | Testing timestamp, HTTP call, and logging requires mocking globals |
| Impact  | Tests are flaky (time-dependent) or require complex setup         |

### SKIP

```typescript
function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "JPY" }).format(amount);
}
```

| Field  | Value                                                        |
| ------ | ------------------------------------------------------------ |
| Filter | Context Test: pure function, no hidden dependencies          |
| Signal | `Intl.NumberFormat` is deterministic; test with input/output |

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

| Field   | Value                                                                |
| ------- | -------------------------------------------------------------------- |
| Filter  | Harm Test pass — N child re-renders per parent render                |
| Trigger | Any state change in parent; list with 100+ items                     |
| Impact  | Inline arrow + inline object break `React.memo` on every child       |

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
| Filter | Context Test: leaf component, no children to re-render             |
| Signal | Inline arrow on leaf; memoizing saves nothing (no subtree)         |

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

| Field   | Value                                                          |
| ------- | -------------------------------------------------------------- |
| Filter  | Harm Test pass — CSS media query replaces this entirely        |
| Trigger | Every window resize fires JS handler                           |
| Impact  | `@media (max-width: 768px) { .sidebar { display: none } }` — zero JS, better performance |

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

| Field  | Value                                                              |
| ------ | ------------------------------------------------------------------ |
| Filter | Context Test: no CSS equivalent for data fetching on scroll        |
| Signal | IntersectionObserver triggers API call; CSS cannot fetch data       |

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

| Field   | Value                                                            |
| ------- | ---------------------------------------------------------------- |
| Filter  | Harm Test pass — page-level with no error containment            |
| Trigger | API returns error or unexpected shape                            |
| Impact  | Entire page white-screens; user sees React error overlay         |

### SKIP

```tsx
function PriceTag({ amount }: { amount: number }) {
  return <span>{formatCurrency(amount)}</span>;
}
```

| Field  | Value                                                         |
| ------ | ------------------------------------------------------------- |
| Filter | Context Test: internal presentational, parent handles errors  |
| Signal | No async, no side effects; parent ErrorBoundary covers this   |

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

| Field   | Value                                                              |
| ------- | ------------------------------------------------------------------ |
| Filter  | Harm Test pass — retry without understanding cause                 |
| Trigger | Connection pool exhaustion or constraint violation                  |
| Impact  | Doubles load on failing DB; masks root cause (pool sizing or validation gap) |

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

| Field  | Value                                                              |
| ------ | ------------------------------------------------------------------ |
| Filter | Context Test: intentional resilience for known transient errors    |
| Signal | Scoped to specific HTTP status codes; external dependency          |

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

| Field   | Value                                                          |
| ------- | -------------------------------------------------------------- |
| Filter  | Harm Test pass — identical logic reimplemented                 |
| Trigger | Email validation rule change (e.g., allow + aliases)           |
| Impact  | Update one, forget the other; inconsistent validation          |

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
| Filter | Context Test: domain-specific logic with no existing equivalent  |
| Signal | Billing cycle validation is unique to this feature               |

---

## DOC (document-reviewer)

### REPORT

```markdown
## Installation

Install globally:
$ npm install -g myapp
```

| Field   | Value                                                             |
| ------- | ----------------------------------------------------------------- |
| Filter  | Harm Test pass — outdated instruction causes user failure         |
| Trigger | User follows deprecated global install; conflicts with npx usage  |
| Impact  | Setup failure on first experience; user abandons                  |

### SKIP

```markdown
## Architecture

The system uses a pipeline pattern where each stage
transforms the input and passes it to the next stage.
```

| Field  | Value                                                          |
| ------ | -------------------------------------------------------------- |
| Filter | Context Test: accurate prose, style preference not defect      |
| Signal | Content is correct; adding a diagram is improvement, not a fix |

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

| Field   | Value                                                        |
| ------- | ------------------------------------------------------------ |
| Filter  | Harm Test pass — 4 lines of prose = 1 table row              |
| Trigger | LLM processes ~60 tokens for a 2-column rule                 |
| Impact  | `\| invalid input \| return error \|` saves 50+ tokens       |

### SKIP

```markdown
This reviewer detects silent failures — errors that are caught but
not surfaced to the user or logged for operators.
```

| Field  | Value                                                         |
| ------ | ------------------------------------------------------------- |
| Filter | Context Test: 2-line intro before detailed table              |
| Signal | Brief context-setting prose; converting to table adds nothing |

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

| Field   | Value                                                              |
| ------- | ------------------------------------------------------------------ |
| Filter  | Harm Test pass — keyboard and screen reader inaccessible           |
| Trigger | Tab key skips dropdown; screen reader announces "group" not "listbox" |
| Impact  | WCAG 2.1.1 (Keyboard), 4.1.2 (Name, Role, Value) failure         |

### SKIP

```tsx
function SubmitButton({ onClick, children }: Props) {
  return <button type="submit" onClick={onClick}>{children}</button>;
}
```

| Field  | Value                                                        |
| ------ | ------------------------------------------------------------ |
| Filter | Context Test: native element provides built-in a11y          |
| Signal | `<button>` has keyboard, focus, and role by default          |

---

## SOW (sow-spec-reviewer)

### REPORT

```markdown
### FR-001: Order Processing
The system processes orders and updates the database accordingly.
```

| Field   | Value                                                         |
| ------- | ------------------------------------------------------------- |
| Filter  | Harm Test pass — no SHALL, no EARS pattern, not implementable |
| Trigger | Developer cannot determine exact behavior to build            |
| Impact  | -3 (SHALL missing) + -3 (no EARS pattern) = -6 actionability  |

### SKIP

```markdown
## Background
The current order processing system was built in 2019 and handles
approximately 500 orders per day. Peak load occurs during lunch hours.
```

| Field  | Value                                                          |
| ------ | -------------------------------------------------------------- |
| Filter | Context Test: background section, not a requirement            |
| Signal | Descriptive prose in Background; SHALL/EARS applies to FR only |
