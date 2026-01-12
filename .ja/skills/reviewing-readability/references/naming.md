# 命名と構造の基本

## 誤解されない名前

```typescript
// Bad: 曖昧
results.filter((x) => x > LIMIT); // 以上？より大きい？

// Good: 意図が明確
results.filter((x) => x >= MIN_ITEMS_TO_DISPLAY);
```

**重要な原則**: 読む人が変数が何を表すか正確に理解できること

---

## 抽象より具体を優先

```typescript
// Bad: 抽象的
processData(data);
getUserInfo(id);
handleEvent(e);

// Good: 具体的
validateUserRegistration(formData);
fetchUserProfileById(userId);
handleLoginButtonClick(event);
```

**理由**: 抽象的な名前は読み手に実装を調べることを強いる

---

## 変数の命名ガイドライン

### 具体的 > 汎用的

```typescript
// Bad: 汎用的
const data = fetchUser();
const result = calculate();
const temp = getValue();

// Good: 具体的
const userProfile = fetchUser();
const totalPrice = calculate();
const originalUsername = getValue();
```

### 検索可能

```typescript
// Bad: 検索できない
const DAYS_IN_WEEK = 7
for (let i = 0; i < 7; i++)  // マジックナンバー

// Good: 検索可能
const DAYS_IN_WEEK = 7
for (let i = 0; i < DAYS_IN_WEEK; i++)
```

### 発音可能

```typescript
// Bad: 発音できない
const usrCstmrRcd = getRecord();
const genymdhms = generateTimestamp();

// Good: 発音可能
const userCustomerRecord = getRecord();
const generatedTimestamp = generateTimestamp();
```

---

## 関数の命名ガイドライン

### 説明的な名前

```typescript
// Bad: 不明確
function calc() {}
function process() {}
function handle() {}

// Good: 説明的
function calculateTotalPrice() {}
function validateUserInput() {}
function handleLoginSubmit() {}
```

### 動詞-名詞パターン

```typescript
// Good: アクション + ターゲット
getUserById(id);
createNewPost(data);
deleteComment(commentId);
isValidEmail(email);
hasPermission(user, resource);
```

---

## コード構造の基本

### 関数ごとに1つのタスク

```typescript
// Bad: 複数のタスク
function processUser(user) {
  // バリデーション
  if (!user.email) throw Error();
  // 変換
  user.name = user.name.toUpperCase();
  // 保存
  db.save(user);
  // 通知
  sendEmail(user.email);
}

// Good: 単一責任
function validateUser(user) {
  if (!user.email) throw Error();
}

function normalizeUserData(user) {
  return { ...user, name: user.name.toUpperCase() };
}

function saveUser(user) {
  return db.save(user);
}

function notifyUser(user) {
  sendEmail(user.email);
}
```

### 無関係なサブ問題を抽出

```typescript
// Good: 各関数が1つのことを行う
function getActiveUsers(users: User[]) {
  return users.filter(isActiveUser);
}

function isActiveUser(user: User): boolean {
  return user.status === "active" && user.lastLogin > thirtyDaysAgo();
}

function thirtyDaysAgo(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date;
}
```

---

## 最終テスト

自問してください: **「実装を見なくても、この名前/構造を誰かが理解できる？」**

できないなら、より具体的で説明的にする。

## 関連

- [@../../../../skills/applying-code-principles/SKILL.md](../../../../skills/applying-code-principles/SKILL.md) - 完全な可読性原則
- [@../../applying-frontend-patterns/references/container-presentational.md](../../applying-frontend-patterns/references/container-presentational.md) - コンポーネント命名パターン
