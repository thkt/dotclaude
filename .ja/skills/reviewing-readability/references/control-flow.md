# 制御フローと複雑さの管理

## ネストの深さを最小化

**ガイドライン**: 最大3レベルのネスト、理想は2

### ガード句を使用

```typescript
// Bad: 深いネスト（4レベル）
function processOrder(order) {
  if (order) {
    if (order.isValid) {
      if (order.user) {
        if (order.user.hasPermission) {
          // 注文を処理
        }
      }
    }
  }
}

// Good: ガード句（1レベル）
function processOrder(order) {
  if (!order) return
  if (!order.isValid) return
  if (!order.user) return
  if (!order.user.hasPermission) return

  // 注文を処理
}
```

### 早期リターン

```typescript
// Bad: ネストしたif-else
function calculateDiscount(user, amount) {
  if (user.isPremium) {
    if (amount > 100) {
      return amount * 0.2
    } else {
      return amount * 0.1
    }
  } else {
    return 0
  }
}

// Good: 早期リターン
function calculateDiscount(user, amount) {
  if (!user.isPremium) return 0
  if (amount > 100) return amount * 0.2
  return amount * 0.1
}
```

---

## 複雑な条件を抽出

```typescript
// Bad: 複雑なインライン条件
if (user.age >= 18 && user.hasConsent && !user.isBanned && user.country === 'US') {
  allowAccess()
}

// Good: 適切な名前の関数に抽出
function canAccessContent(user: User): boolean {
  return user.age >= 18 &&
         user.hasConsent &&
         !user.isBanned &&
         user.country === 'US'
}

if (canAccessContent(user)) {
  allowAccess()
}
```

---

## ミラーの法則の適用（7±2の制限）

### 関数パラメータ: 最大5

```typescript
// Bad: パラメータが多すぎる（8）
function createUser(
  firstName, lastName, email, phone,
  address, city, state, zipCode
) { }

// Good: パラメータオブジェクト（3グループ）
function createUser(
  identity: UserIdentity,    // firstName, lastName, email
  contact: ContactInfo,      // phone, address
  location: Location         // city, state, zipCode
) { }
```

### 条件分岐: 最大5

```typescript
// Bad: 分岐が多すぎる（7）
function getStatus(code) {
  if (code === 'A') return 'Active'
  if (code === 'P') return 'Pending'
  if (code === 'S') return 'Suspended'
  if (code === 'B') return 'Banned'
  if (code === 'D') return 'Deleted'
  if (code === 'I') return 'Inactive'
  if (code === 'V') return 'Verified'
}

// Good: データ構造を使用
const STATUS_MAP = {
  A: 'Active',
  P: 'Pending',
  S: 'Suspended',
  B: 'Banned',
  D: 'Deleted',
  I: 'Inactive',
  V: 'Verified'
}

function getStatus(code) {
  return STATUS_MAP[code] || 'Unknown'
}
```

### 関数の長さ: 5-15行

```typescript
// Good: 理想的な関数の長さ
function validateEmail(email: string): boolean {
  if (!email) return false

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
```

**15行を超える場合**: 小さな関数に分割

---

## 制御フローを明確に

### 巧妙なトリックを避ける

```typescript
// Bad: 巧妙だが混乱を招く
const result = condition ? value1 : value2 || value3 && value4

// Good: 意図が明確
let result
if (condition) {
  result = value1
} else if (value2) {
  result = value2
} else if (value4) {
  result = value4
} else {
  result = value3
}
```

### 一貫したパターン

```typescript
// Good: 一貫した早期リターンパターン
function processA() {
  if (!valid) return null
  // 処理
}

function processB() {
  if (!valid) return null  // 同じパターン
  // 処理
}
```

---

## 認知負荷チェックリスト

各関数について確認:

- [ ] パラメータ ≤ 5?
- [ ] ネストの深さ ≤ 3?
- [ ] 条件分岐 ≤ 5?
- [ ] 関数の長さ ≤ 15行?
- [ ] 複雑な条件が抽出されている?
- [ ] ガード句を使用している?

**いずれかに失敗した場合**: 認知負荷を減らすためにリファクタリング
