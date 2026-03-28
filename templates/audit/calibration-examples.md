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
