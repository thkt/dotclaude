---
paths: "**/*.{ts,tsx,js,jsx,md}"
summary: |
  「直接の友人とだけ話す」 - 結合を最小化。
  メソッドチェーン（a.b().c().d()）を避ける。聞くな、言え。
  オブジェクトは直接の隣人とのみ対話すべき。
decision_question: "オブジェクトを通過してデータを取得していない？"
---

# デメテルの法則 - 最小知識の原則

**コア原則**: 「直接の友人とだけ話す」

## コア哲学

オブジェクトは以下とのみ対話すべき:

- **自身** - 自身のメソッドとプロパティ
- **パラメータ** - 引数として渡されたオブジェクト
- **作成したオブジェクト** - 自身が作成したオブジェクト
- **直接のコンポーネント** - 直接のプロパティ
- **グローバルオブジェクト** - 限定的で明確に定義されたケース

## 解決する問題

```typescript
// 悪い例: 列車事故 - デメテルの法則に違反
const street = user.getAddress().getCity().getStreet().getName()
if (order.getCustomer().getPaymentMethod().isValid()) {
  order.getCustomer().getPaymentMethod().charge(amount)
}

// 良い例: 直接対話のみ
const street = user.getStreetName()
if (order.canCharge()) {
  order.charge(amount)
}
```

解決される問題:

- **高い結合** - コードが知りすぎ
- **脆いコード** - 変更が波及
- **テスト困難** - 複雑なモックが必要
- **カプセル化不良** - 内部が露出

## 主要テクニック

### 1. 聞くな、言え

```typescript
// 悪い例: 決定を下すためにデータを要求
if (employee.getDepartment().getBudget() > amount) {
  employee.getDepartment().getBudget().subtract(amount)
}

// 良い例: オブジェクトに何をすべきか伝える
if (employee.canExpense(amount)) {
  employee.expense(amount)
}
```

### 2. デリゲートを隠す

```typescript
// 悪い例: 内部構造を露出
class Order {
  getCustomer(): Customer { return this.customer }
}
// 使用: order.getCustomer().getName()

// 良い例: デリゲーションを隠す
class Order {
  getCustomerName(): string {
    return this.customer.getName()
  }
}
// 使用: order.getCustomerName()
```

## 実践的な適用

### Reactコンポーネント

```tsx
// 悪い例: コンポーネントが知りすぎ
function UserCard({ user }) {
  return <h2>{user.profile.info.name.displayName}</h2>
}

// 良い例: コンポーネントは必要なものを受け取る
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
// 悪い例: 内部構造を露出
class BankAccount {
  getTransactions(): Transaction[] {
    return this.transactions
  }
}

// 良い例: 特定のメソッドを提供
class BankAccount {
  getTransactionsAbove(amount: number): Transaction[] {
    return this.transactions.filter(t => t.amount > amount)
  }
}
```

### テストの利点

```typescript
// 悪い例: 複雑なモック
const mockCity = { getTaxRate: jest.fn(() => 0.08) }
const mockAddress = { getCity: jest.fn(() => mockCity) }
const mockCustomer = { getAddress: jest.fn(() => mockAddress) }

// 良い例: シンプルなインターフェース
const mockCustomer = { getTaxRate: jest.fn(() => 0.08) }
```

## 例外

### 違反してもよい場合

**フルーエントインターフェース** - チェーン用に設計:

```typescript
query.select('*').from('users').where('active', true).limit(10)
```

また許容:

- ビルダーパターン
- データ変換パイプライン（map/filter/reduce）

## 適用ガイドライン

### コードレビューチェックリスト

- [ ] 2-3呼び出しより長いメソッドチェーンがない
- [ ] コンポーネントはオブジェクト全体ではなく特定のpropsを受け取る
- [ ] オブジェクトを通過してデータを取得していない
- [ ] 「聞くな、言え」原則を適用
- [ ] テストセットアップがシンプルで深くネストしていない

### リファクタリングシグナル

以下を探す:

- `getX().getY().getZ()` パターン
- テストでの複雑なモックセットアップ
- チェーン内の頻繁なnullチェック
- 無関係なコードを壊す変更

## 覚えておく

> 「各ユニットは他のユニットについて限定的な知識のみを持つべき: 現在のユニットに'密接に'関連するユニットのみ。」

目標は**低結合**と**高凝集**:

- オブジェクトはお互いについて知識が少ない
- 変更がシステム全体に波及しない
- テストがシンプルになる
- コードがよりメンテナンスしやすくなる

## 関連原則

参照: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md#development-practices)
