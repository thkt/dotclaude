# 純粋関数

## 定義

| 特性                 | 純粋 | 不純 |
| -------------------- | ---- | ---- |
| 同じ入力 → 同じ出力  | ✓    | ✗    |
| 副作用なし           | ✓    | ✗    |
| 外部状態への依存なし | ✓    | ✗    |

## 例

| 不純                       | 純粋                                        |
| -------------------------- | ------------------------------------------- |
| グローバル`taxRate`を使用  | `(price, taxRate) => price * (1 + taxRate)` |
| `cart.push(item)` ミュート | `[...cart, item]` 新しい配列                |
| 内部で`new Date()`         | `(expiry, now) => now > expiry`             |
| 内部で`api.getUser()`      | userをパラメータとして受け取る              |

## 分離パターン

```typescript
// 純粋: ビジネスロジック
function calculateDiscount(purchases: number): number {
  if (purchases > 100) return 0.2;
  if (purchases > 50) return 0.15;
  return 0;
}

// 不純: データ取得（分離）
async function getUserDiscount(userId: string) {
  const history = await api.getPurchaseHistory(userId);
  return calculateDiscount(history.length);
}

// 純粋関数は簡単にテスト
expect(calculateDiscount(101)).toBe(0.2);
```

## Reactパターン

### コンポーネント分離

```typescript
// 純粋: Presentational
function OrderSummary({ subtotal, tax, total }: Props) {
  return <div>Total: ${total}</div>
}

// 不純: Container
function OrderSummaryContainer() {
  const { items } = useCart() // 副作用
  const total = calculateTotal(items)
  return <OrderSummary total={total} />
}
```

### Hook分離

```typescript
// 純粋: 計算Hook
function useOrderCalc(items: Item[]) {
  return useMemo(
    () => ({
      subtotal: items.reduce((s, i) => s + i.price, 0),
      tax: subtotal * 0.1,
    }),
    [items],
  );
}

// 不純: データHook
function useOrderData(id: string) {
  const [items, setItems] = useState([]);
  useEffect(() => api.getItems(id).then(setItems), [id]);
  return items;
}
```

## テストの利点

| 不純             | 純粋             |
| ---------------- | ---------------- |
| APIモックが必要  | テストデータのみ |
| 外部状態のセット | パラメータのみ   |
| 非同期/不安定    | 同期             |
| 複雑なセット     | シンプルな呼び出 |
