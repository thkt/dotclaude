# 純粋関数 - 副作用の分離

## 関数を純粋にするものは何か？

純粋関数:

1. **同じ入力 → 同じ出力**（決定論的）
2. **副作用なし**（外部状態を変更しない）
3. **外部状態に依存しない**（パラメータを除く）

## 純粋 vs 不純

```typescript
// Bad: 不純: 外部状態に依存
let taxRate = 0.1
function calculateTotal(price: number): number {
  return price * (1 + taxRate) // 外部のtaxRateに依存
}

// Good: 純粋: すべての入力がパラメータ
function calculateTotal(price: number, taxRate: number): number {
  return price * (1 + taxRate)
}
```

```typescript
// Bad: 不純: 副作用（外部状態を変更）
function addItem(cart: Item[], item: Item): void {
  cart.push(item) // 入力を変更
}

// Good: 純粋: 新しい状態を返す
function addItem(cart: Item[], item: Item): Item[] {
  return [...cart, item] // 新しい配列を返す
}
```

```typescript
// Bad: 不純: 副作用（API呼び出し）
function getDiscountedPrice(userId: string, price: number): number {
  const user = api.getUser(userId) // 副作用！
  return price * (1 - user.discount)
}

// Good: 純粋: ユーザーをパラメータとして受け取る
function getDiscountedPrice(discount: number, price: number): number {
  return price * (1 - discount)
}
```

## 純粋と不純の分離

### パターン: コアロジックを純粋関数に

```typescript
// 純粋: ビジネスロジック
function calculateDiscount(purchaseCount: number): number {
  if (purchaseCount > 100) return 0.20
  if (purchaseCount > 50) return 0.15
  if (purchaseCount > 10) return 0.10
  return 0
}

// 不純: データ取得（分離）
async function getUserDiscount(userId: string): Promise<number> {
  const history = await api.getPurchaseHistory(userId)
  return calculateDiscount(history.length)
}

// 純粋関数は簡単にテスト
expect(calculateDiscount(101)).toBe(0.20)
expect(calculateDiscount(51)).toBe(0.15)
expect(calculateDiscount(11)).toBe(0.10)
expect(calculateDiscount(5)).toBe(0)
```

### パターン: Reactコンポーネントの分離

```typescript
// 純粋: Presentationalコンポーネント
interface OrderSummaryProps {
  items: Item[]
  subtotal: number
  tax: number
  total: number
}

function OrderSummary({ items, subtotal, tax, total }: OrderSummaryProps) {
  return (
    <div>
      <ItemList items={items} />
      <div>小計: ¥{subtotal}</div>
      <div>税: ¥{tax}</div>
      <div>合計: ¥{total}</div>
    </div>
  )
}

// 不純: 副作用のあるコンテナ
function OrderSummaryContainer() {
  const { items } = useCart()
  const subtotal = calculateSubtotal(items)
  const tax = calculateTax(subtotal)
  const total = subtotal + tax

  return (
    <OrderSummary
      items={items}
      subtotal={subtotal}
      tax={tax}
      total={total}
    />
  )
}
```

### パターン: カスタムフックの分離

```typescript
// 純粋: ロジックフック（副作用なし）
function useOrderCalculations(items: Item[]) {
  const subtotal = useMemo(() =>
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  )
  const tax = subtotal * 0.1
  const total = subtotal + tax

  return { subtotal, tax, total }
}

// 不純: データフック（副作用あり）
function useOrderData(orderId: string) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getOrderItems(orderId)
      .then(setItems)
      .finally(() => setLoading(false))
  }, [orderId])

  return { items, loading }
}

// コンポーネントで組み合わせ
function OrderPage({ orderId }: { orderId: string }) {
  const { items, loading } = useOrderData(orderId)
  const calculations = useOrderCalculations(items)

  if (loading) return <Spinner />
  return <OrderSummary items={items} {...calculations} />
}
```

## テストのメリット

| 不純なコード | 純粋なコード |
| --- | --- |
| APIのモックが必要 | テストデータで呼び出すだけ |
| 外部状態のセットアップ | 状態をパラメータとして渡す |
| タイマーのモック | 時間をパラメータに |
| 不安定な非同期テスト | 同期テスト |

## チェックリスト

- [ ] ビジネスロジックを純粋関数に抽出
- [ ] 副作用を特定の関数/フックに分離
- [ ] 入力パラメータを変更しない
- [ ] Presentationalコンポーネントは純粋
- [ ] 時間/日付を注入可能なパラメータに
- [ ] ランダム値を注入可能なパラメータに
