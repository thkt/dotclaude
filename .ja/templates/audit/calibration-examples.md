# Calibration 例

監査レビュアー向けのドメイン固有REPORT/SKIP例。各レビュアーがこのファイルを
参照する。原則は `finding-schema.md` を参照。

## 出典

以下の例は実際のaudit FPパターンから手作成。拡充・検証には外部ベンチマークを使用:

| Dataset                          | 用途                                              |
| -------------------------------- | ------------------------------------------------- |
| Qodo Code Review Benchmark 1.0  | 実PRの欠陥注入。ground truth（TP/FP）付き         |
| CodeReviewQA (HuggingFace)      | 9言語900件のキュレーション済みレビューインタラクション |
| Suppressed SAST Warnings        | 開発者が抑制した1,873件の警告 = SKIPケース        |
| OWASP Benchmark                 | セキュリティ特化のFP/TP評価                       |
| Greptile AI Review Benchmark    | 50件の実PRでのAIレビューノイズ率                  |

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

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Filter  | Senior Engineer Test pass — 変更を求める               |
| Trigger | この関数を読むすべての開発者                           |
| Impact  | ネスト5段 + 引数6個 + 1文字変数 = 読めない             |

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
| Filter | Senior Engineer Test fail — 好みの問題であり欠陥ではない           |
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

| Field   | Value                                                              |
| ------- | ------------------------------------------------------------------ |
| Filter  | Harm Test pass — ホットパスで計測可能な無駄                        |
| Trigger | ユーザーの検索呼び出しごと                                         |
| Impact  | プール再利用の代わりに毎回DB接続を開く。レイテンシ + リーク        |
| Path    | Hot — ユーザー向け関数                                             |

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
| Filter | Context Test: コールドパス                                     |
| Signal | 起動時に1回だけ実行。環境変数2回読み込みは無視できる           |
| Path   | Cold — キャッシュ追加は複雑さに対してユーザー体感ゼロの改善    |

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

| Field       | Value                                                    |
| ----------- | -------------------------------------------------------- |
| Filter      | Harm Test pass — セキュリティリグレッションの具体的trigger |
| Trigger     | 期限チェックがリグレッション                             |
| Impact      | 無効なトークンがサイレントに通過。認証バイパス           |
| Criticality | 9/10 — public API、認証境界                              |

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
| Filter | Context Test: 間接カバー                                                 |
| Signal | chunkerテスト2件がこのヘルパーを経由して観測可能な動作を検証済み         |
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

| Field   | Value                                                              |
| ------- | ------------------------------------------------------------------ |
| Filter  | Harm Test pass — 協調更新リスク                                    |
| Trigger | エラーハンドリング変更（ログ追加、カスタムエラー型など）           |
| Impact  | 4箇所の同一コールサイトを更新必要。1箇所漏れ = 不整合             |
| Count   | 4箇所 — Rule of Three 閾値超過                                     |

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

| Field  | Value                                                                    |
| ------ | ------------------------------------------------------------------------ |
| Filter | Context Test: 意味的差異                                                 |
| Signal | ドメイン固有のデフォルト値（`role: "member"` vs `plan: "free"`）と副作用（`sendWelcomeEmail` vs `notifyAdmins`） |
| Count  | 2箇所 — Rule of Three の抽出緊急度閾値未満                               |

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

| Field   | Value                                                                  |
| ------- | ---------------------------------------------------------------------- |
| Filter  | Harm Test pass — 具体的な障害シナリオあり                              |
| Trigger | Slack APIのネットワークエラー、認証失敗、レート制限                     |
| Impact  | 呼び出し元は `Ok(0)` を受け取り、「メッセージなし」と「APIダウン」を区別できない |

### SKIP

```rust
fn load_config(path: &Path) -> Config {
    match fs::read_to_string(path) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => Config::default(),  // first run — config file doesn't exist yet
    }
}
```

| Field  | Value                                                                     |
| ------ | ------------------------------------------------------------------------- |
| Filter | Context Test: 意図的フォールバック                                        |
| Signal | 関数名 `load_config`（`require_config` ではない）、`default()` の戻り値  |
| Path   | Cold — 起動時に1回だけ実行                                                |
