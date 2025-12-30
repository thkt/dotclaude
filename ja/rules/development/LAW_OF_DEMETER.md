# デメテルの法則 - 最小知識の原則

**核心原則**: 「直接の友達とだけ話す」

## 核心哲学

オブジェクトは以下とのみ相互作用すべき：

- **自分自身** - 自身のメソッドとプロパティ
- **パラメータ** - 引数として渡されたオブジェクト
- **作成したオブジェクト** - 自身が作成したオブジェクト
- **直接のコンポーネント** - 直接のプロパティ
- **グローバルオブジェクト** - 限定的で明確に定義された場合

## 解決する問題

```typescript
// Bad: Train wreck - デメテルの法則違反
const street = user.getAddress().getCity().getStreet().getName()
if (order.getCustomer().getPaymentMethod().isValid()) {
  order.getCustomer().getPaymentMethod().charge(amount)
}

// Good: 直接の相互作用のみ
const street = user.getStreetName()
if (order.canCharge()) {
  order.charge(amount)
}
```

解決される問題：

- **高い結合度** - コードが知りすぎる
- **脆いコード** - 変更が連鎖する
- **テストが困難** - 複雑なモックが必要
- **カプセル化の欠如** - 内部が露出

## 主要テクニック

### 1. Tell, Don't Ask

```typescript
// Bad: データを聞いて判断
if (employee.getDepartment().getBudget() > amount) {
  employee.getDepartment().getBudget().subtract(amount)
}

// Good: オブジェクトに何をすべきか伝える
if (employee.canExpense(amount)) {
  employee.expense(amount)
}
```

### 2. 委譲を隠す

```typescript
// Bad: 内部構造を露出
class Order {
  getCustomer(): Customer { return this.customer }
}
// 使用：order.getCustomer().getName()

// Good: 委譲を隠す
class Order {
  getCustomerName(): string {
    return this.customer.getName()
  }
}
// 使用：order.getCustomerName()
```

## 実践的な適用

### Reactコンポーネント

```tsx
// Bad: コンポーネントが知りすぎる
function UserCard({ user }) {
  return <h2>{user.profile.info.name.displayName}</h2>
}

// Good: コンポーネントは必要なものだけ受け取る
function UserCard({ displayName }) {
  return <h2>{displayName}</h2>
}

// 親が抽出を処理
function UserCardContainer({ user }) {
  return <UserCard displayName={user.getDisplayName()} />
}
```

### API設計

```typescript
// Bad: 内部構造を露出
class BankAccount {
  getTransactions(): Transaction[] {
    return this.transactions
  }
}

// Good: 特定のメソッドを提供
class BankAccount {
  getTransactionsAbove(amount: number): Transaction[] {
    return this.transactions.filter(t => t.amount > amount)
  }
}
```

### テストの利点

```typescript
// Bad: 複雑なモッキング
const mockCity = { getTaxRate: jest.fn(() => 0.08) }
const mockAddress = { getCity: jest.fn(() => mockCity) }
const mockCustomer = { getAddress: jest.fn(() => mockAddress) }

// Good: シンプルなインターフェース
const mockCustomer = { getTaxRate: jest.fn(() => 0.08) }
```

## 例外

### 違反してもOKな場合

**流暢インターフェース** - チェーン用に設計：

```typescript
query.select('*').from('users').where('active', true).limit(10)
```

また許容される：

- ビルダーパターン
- データ変換パイプライン（map/filter/reduce）

## 適用のガイドライン

### コードレビューチェックリスト

- [ ] メソッドチェーンが2-3呼び出し以下
- [ ] コンポーネントは特定のプロップスを受け取り、オブジェクト全体ではない
- [ ] オブジェクトを通してデータを取得していない
- [ ] Tell, don't askの原則が適用されている
- [ ] テストセットアップがシンプルで、深くネストしていない

### リファクタリングのシグナル

探すべきもの：

- `getX().getY().getZ()` パターン
- テストでの複雑なモックセットアップ
- チェーンでの頻繁なnullチェック
- 無関係なコードを壊す変更

## 覚えておくこと

> 「各ユニットは他のユニットについて限定的な知識のみを持つべき：現在のユニットと『密接に』関連するユニットのみ」

目標は**低結合**と**高凝集**：

- オブジェクトは互いについて知ることが少ない
- 変更がシステム全体に連鎖しない
- テストがシンプルになる
- コードが保守しやすくなる

## 関連する原則

参照: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md#development-practices)
