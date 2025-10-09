# AI駆動開発を支える三層の開発原則

## なぜ原則が必要なのか

AI時代のコード開発では、「AIに何を書かせるか」以上に「どう書かせるか」が重要です。`.claude`ディレクトリを使えば、開発原則をルール化してAIに自動適用させることができます。本記事では、実践で使える核心的な原則のエッセンスを紹介します。

---

## 三層の原則ピラミッド

開発原則は3つのレベルで階層化されています。

```
             🔴 Occam's Razor
                   ↓
    🟡 Progressive Enhancement, Leaky Abstraction
          Readable Code, DRY
                   ↓
       🟢 TDD, Law of Demeter
    Container/Presentational, TIDYINGS
```

---

### 🔴 レベル1：Occam's Razor（オッカムの剃刀）

**「最もシンプルな解決策を選ぶ」**

すべての原則の頂点に立つメタ原則。他のどんな原則とも衝突したら、常に「よりシンプルな方」を選びます。

```typescript
// ❌ 過剰な抽象化
interface UserProcessor {
  process(user: User): ProcessedUser
}

class DefaultUserProcessor implements UserProcessor {
  process(user: User): ProcessedUser {
    return { ...user, processed: true }
  }
}

// ✅ 直接的アプローチ
function processUser(user: User): ProcessedUser {
  return { ...user, processed: true }
}
// インターフェースは2つ目の実装が必要になってから追加
```

**判断基準**：

- 「これより簡単な方法はないか？」
- 「今の要件を満たす最小の実装は何か？」
- 「未来の拡張性のために複雑化していないか？」

**衝突時の振る舞い**：

- DRYと衝突 → 少しの重複を許容してもシンプルさを優先
- SOLIDと衝突 → 過剰な設計を避けてシンプルさを優先

---

### 🟡 レベル2：デフォルトで適用する原則

#### Progressive Enhancement（段階的拡張）

**「シンプルに始めて、必要になってから拡張」**

すべての実装は3つのフェーズで段階的に成長させます：

```typescript
// Phase 1: 動くものを作る（Occam's Razor）
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// Phase 2: 実際のエラーに遭遇してから対処
function calculateTotal(items) {
  if (!items) return 0  // ← 必要になってから追加
  return items.reduce((sum, item) => sum + item.price, 0)
}

// Phase 3: 実際のパフォーマンス問題が測定されてから最適化
const calculateTotal = memo((items) => {
  if (!items) return 0
  return items.reduce((sum, item) => sum + item.price, 0)
})
```

**ルール**：

- 「もし〜だったら」で始まる機能は実装しない
- エラーハンドリングは実際にエラーが出てから
- 最適化は遅いと測定されてから

---

#### Leaky Abstraction（漏れる抽象化の法則）

**「完璧な抽象化は幻想。必ず漏れることを前提に設計する」** - Joel Spolsky

すべての抽象化は、いずれその下の実装が顔を出します。ORMを使えばSQLを知らなくていい？嘘です。パフォーマンス問題が出たら結局SQLを書きます。

```typescript
// ❌ 抽象化だけで完結すると思い込む
class DataService {
  async findUsers(criteria) {
    return this.orm.findAll(criteria)  // N+1問題発生...
  }
}

// ✅ 抽象化 + エスケープハッチ（逃げ道）
class DataService {
  // 80%のケースはこれで十分
  async findUsers(criteria: Simple) {
    return this.orm.findAll(criteria)
  }

  // 抽象化が漏れた時の逃げ道を用意
  async findUsersRaw(sql: string) {
    return this.db.raw(sql)  // 直接SQL実行
  }
}
```

**実践のポイント**：
- 抽象化は段階的に（Progressive Enhancement）
- エスケープハッチを必ず用意
- 「一つ下のレイヤー」を理解しておく（Reactなら DOM、ORMならSQL）

**Perfect vs Working**：
完璧な抽象化を目指すより、漏れを認めたシンプルな抽象化の方が実用的です（Occam's Razor）。

---

#### Readable Code（読みやすいコード）

**「1分ルール：新メンバーが1分で理解できなければリファクタ」**

人間の認知能力には限界があります（Miller's Law: 7±2個）。この科学的事実に基づき、コードは短く明確に保ちます。

```typescript
// ❌ ネストが深く理解に時間がかかる
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // 処理
    }
  }
}

// ✅ ガード句で読みやすく
if (!user) return
if (!user.isActive) return
if (!user.hasPermission) return
// 処理
```

```typescript
// ❌ 抽象的で意図不明
processData(data)

// ✅ 具体的で意図が明確
validateUserRegistration(formData)
```

**DRYとの衝突時**：
読みやすさを優先します。複雑な抽象化より、少しの重複の方がマシです。

```typescript
// ✅ 2つの似た関数だが、それぞれ明確
function processUsers(users) {
  return users
    .filter(user => user.active)
    .map(user => ({ ...user, type: 'user' }))
}

function processAdmins(admins) {
  return admins
    .filter(admin => admin.enabled)
    .map(admin => ({ ...admin, type: 'admin' }))
}

// ❌ DRYを優先して読みにくくなった例
const processData = (data, mode) => {
  return mode === 'user'
    ? data.filter(x => x.active).map(x => ({...x, type: 'user'}))
    : data.filter(x => x.enabled).map(x => ({...x, type: 'admin'}))
}
```

---

#### DRY - Don't Repeat Yourself（重複の排除）

**「Rule of Three：3回目で抽象化」** - Andy Hunt & Dave Thomas

重複を見つけても、すぐに抽象化しないのがポイント。本当に同じパターンか見極めるために、3回目で抽象化します。

```typescript
// 1回目：そのまま書く
function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// 2回目：重複を認識するが、まだ抽象化しない
function validatePhone(phone: string) {
  return /^\d{3}-\d{4}-\d{4}$/.test(phone)
}

// 3回目：パターンが見えたので抽象化
function validate(value: string, pattern: RegExp) {
  return pattern.test(value)
}

const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\d{3}-\d{4}-\d{4}$/,
}
```

**偶然の重複 vs 本質的な重複**：

```typescript
// ❌ 偶然同じコードだが、意味が異なる
const MAX_RETRY = 3      // リトライ回数の上限
const COLUMN_COUNT = 3   // UIのカラム数

// これを統一するのは間違い：
const THREE = 3  // ❌ 意味がない

// ✅ それぞれ独立した定数として保つ
```

**DRYが適用される対象**：
- ビジネスロジック（同じ計算式、同じバリデーション）
- データスキーマ（DB定義とモデル定義）
- 設定値（タイムアウト、リミット値）

**DRYを適用しない場合**：
- 偶然似ているだけのコード
- 異なる変更理由を持つコード
- テストデータ（各テストは独立性が重要）

---

### 🟢 レベル3：状況に応じて適用する原則

#### TDD/Baby Steps（テスト駆動開発と小さなステップ）

**「2分サイクル：各ステップは最小の変更のみ」**

```
Red（失敗するテストを書く）30秒
  ↓
Green（最小の実装で通す）1分
  ↓
Refactor（整理）30秒
  ↓
Commit（保存）20秒
─────────────────
合計: 約2分
```

**Baby Stepsの利点**：

- エラーの原因は直前の小さな変更だけ
- 常に数秒で元の動作状態に戻せる
- 小さな成功が積み重なり大きな機能に

```typescript
// ❌ 大きすぎるステップ
function calculateTotal(items, tax, discount) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const afterTax = subtotal * (1 + tax)
  const afterDiscount = afterTax * (1 - discount)
  return afterDiscount
}

// ✅ Baby Steps
// Step 1: まず基本的な合計だけ実装
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// Step 2: テストが要求したら税金を追加
// Step 3: テストが要求したら割引を追加
// ... 各ステップで1つずつ
```

---

#### Law of Demeter（デメテルの法則）

**「Tell, Don't Ask - 尋ねるな、命令せよ」**

オブジェクトは「直接の友達」とだけ話すべき。メソッドチェーンが3つ以上続いたら要注意です。

```typescript
// ❌ Train Wreck（列車事故）- 法則違反
const street = user.getAddress().getCity().getStreet().getName()

if (order.getCustomer().getPaymentMethod().isValid()) {
  order.getCustomer().getPaymentMethod().charge(amount)
}

// ✅ 直接命令する
const street = user.getStreetName()  // userに「通り名を教えて」と命令

if (order.canCharge()) {              // orderに「課金できる？」と尋ねる
  order.charge(amount)                // orderに「課金して」と命令
}
```

**問題点**：
- **高結合**: コードが内部構造に依存しすぎ
- **脆い**: 途中のオブジェクトが変わると壊れる
- **テスト困難**: 複雑なモックが必要

**解決策 - Tell, Don't Ask**：

```typescript
// ❌ 外部でデータを取って判断（Ask）
if (employee.getDepartment().getBudget() > amount) {
  employee.getDepartment().setBudget(
    employee.getDepartment().getBudget() - amount
  )
}

// ✅ オブジェクトに命令する（Tell）
if (employee.canExpense(amount)) {
  employee.expense(amount)
}
```

**Reactでの適用**：
Container/Presentationalパターンは、Law of Demeterを自然に実現します。

```tsx
// ❌ Presentationalが深くアクセス
function UserCard({ user }) {
  return <h2>{user.profile.info.name.displayName}</h2>
}

// ✅ Containerが展開して渡す
function UserCard({ displayName }: { displayName: string }) {
  return <h2>{displayName}</h2>
}

function UserCardContainer({ user }) {
  return <UserCard displayName={user.getDisplayName()} />
}
```

**例外 - Fluent Interface**：
メソッドチェーンが設計の一部なら OK です。

```typescript
// ✅ 設計上のチェーン
query
  .select('*')
  .from('users')
  .where('active', true)
  .limit(10)
```

---

#### Container/Presentational（ロジックとUIの分離）

Law of Demeterを実現する具体的なパターン。Reactでよく使われます。

```tsx
// ✅ Container: ロジック担当
export const TodoContainer = () => {
  const todos = useTodos()  // データ取得

  return (
    <div className="p-4">  {/* レイアウトのみ */}
      <TodoList todos={todos} />
    </div>
  )
}

// ✅ Presentational: 表示のみ
export const TodoList = ({ todos }: { todos: Todo[] }) => {
  return (
    <ul className="bg-white rounded-lg shadow">
      {todos.map(todo => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  )
}
```

**利点**：

- テストが容易（ロジックとUIを別々にテスト）
- 再利用可能（同じUIを別のデータソースで使える）
- 変更の局所化（ロジック変更がUIに影響しない）

---

#### TIDYINGS（触ったら綺麗にする）

**「ボーイスカウトルール：キャンプ場を、来た時よりも美しく」**

レガシーコードを全てリファクタするのは現実的ではありません。触った部分だけ改善することで、コードベースは徐々に良くなります。

**基本原則**：

```typescript
// Before: レガシーコードに新機能を追加する前
function processOrder(order) {
  var total = 0  // var使用
  for(var i=0;i<order.items.length;i++) {  // 古いループ
    total=total+order.items[i].price  // スペースなし
  }
  return total
}

// After: 新機能追加と同時に触った部分を改善
function processOrder(order: Order): number {
  const total = order.items.reduce(  // const、reduce使用
    (sum, item) => sum + item.price,
    0
  )
  return total
}
```

**TIDYINGS の範囲**：

1. **触ったファイルのみ** - 関係ないファイルは触らない
2. **触った関数のみ** - 同じファイル内でも無関係な関数は触らない
3. **小さな改善** - 大規模リファクタは別タスク

```typescript
// ✅ 良い例
// タスク: getUserEmail関数にバリデーション追加
function getUserEmail(userId) {
  const user = findUser(userId)
  // ↓ 新機能追加ついでに改善
  if (!user?.email) {  // Optional Chaining使用
    throw new Error('Email not found')
  }
  return user.email
}

// ❌ 悪い例：別の関数まで触る
function findUser(userId) {  // ← タスクに無関係だが「ついでに」改善
  // リファクタ...
}
```

**改善の優先順位**：

1. **安全性** - null チェック、型付け
2. **可読性** - 変数名、コメント削除
3. **モダン化** - const/let、アロー関数
4. **パフォーマンス** - 測定してから

**重要な制約**：
- **テストを必ず通す** - 改善で動作を壊さない
- **コミットを分ける** - 機能追加と改善は別コミット
- **完璧を目指さない** - 50%良くなればOK

```bash
# ✅ コミットを分ける
git commit -m "refactor: improve processOrder readability"
git commit -m "feat: add email validation to getUserEmail"
```

---

## すぐ使える3つの習慣

明日から実践できる具体的な習慣：

### 1. コードを書く前に「もっと簡単な方法は？」と問う

```
実装前チェックリスト：
□ これより簡単な方法はないか？
□ 今すぐ必要な機能だけに絞ったか？
□ 未来の拡張性のために複雑化していないか？
```

### 2. 実装は2分で完結するステップに分割

```
❌ 「認証機能を実装する」（大きすぎ）
✅ 「ユーザー入力を受け取る関数を書く」（2分）
✅ 「パスワードをハッシュ化する関数を書く」（2分）
✅ 「DBに保存する関数を書く」（2分）
```

### 3. レビュー時に1分タイマーをかける

```
新しいコードを見て1分経っても理解できない
  ↓
リファクタが必要
  ↓
関数を分割、名前を具体的に、ネストを浅く
```

---

## まとめ：原則の自動化

これらの原則を`.claude/CLAUDE.md`と`.claude/rules/`に記述することで、AI開発でも一貫した品質を保てます。

**原則の優先順位**：

1. 🔴 **Occam's Razor** - 常に最もシンプルな方を選ぶ
2. 🟡 **Progressive Enhancement, Leaky Abstraction, Readable Code, DRY** - デフォルトで適用
3. 🟢 **TDD, Law of Demeter, Container/Presentational, TIDYINGS** - 状況に応じて

最も重要なのは「シンプルさ」です。迷ったら、複雑な完璧より、シンプルで動くものを選びましょう。

---

## 参考

本記事の原則は以下の書籍・概念に基づいています：

- **Occam's Razor** - William of Ockham (14世紀)
- **The Art of Readable Code** - Dustin Boswell & Trevor Foucher
- **Progressive Enhancement** - Web開発のベストプラクティス
- **The Law of Leaky Abstractions** - Joel Spolsky (2002)
- **The Pragmatic Programmer (DRY)** - Andy Hunt & Dave Thomas
- **Law of Demeter** - Northeastern University (1987)
- **SOLID Principles** - Robert C. Martin
- **TDD** - Kent Beck
- **Container/Presentational Pattern** - Dan Abramov
- **Boy Scout Rule (TIDYINGS)** - Robert C. Martin

詳細な実装は[Claude Code](https://github.com/anthropics/claude-code)の`.claude`ディレクトリ構成を参照してください。
