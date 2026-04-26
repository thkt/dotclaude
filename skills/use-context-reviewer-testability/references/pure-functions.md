# Pure Functions

## Definition

| Property                 | Pure | Impure |
| ------------------------ | ---- | ------ |
| Same input → same output | ✓    | ✗      |
| No side effects          | ✓    | ✗      |
| No external state        | ✓    | ✗      |

## Examples

| Impure                     | Pure                                        |
| -------------------------- | ------------------------------------------- |
| Uses global `taxRate`      | `(price, taxRate) => price * (1 + taxRate)` |
| `cart.push(item)` mutation | `[...cart, item]` new array                 |
| `new Date()` inside        | `(expiry, now) => now > expiry`             |
| `api.getUser()` inside     | Receive user as parameter                   |

## Separation Pattern

```typescript
// Pure: business logic
function calculateDiscount(purchases: number): number {
  if (purchases > 100) return 0.2;
  if (purchases > 50) return 0.15;
  return 0;
}

// Impure: data fetching (isolated)
async function getUserDiscount(userId: string) {
  const history = await api.getPurchaseHistory(userId);
  return calculateDiscount(history.length);
}

// Test pure function easily
expect(calculateDiscount(101)).toBe(0.2);
```

## React Patterns

### Component Separation

```typescript
// Pure: Presentational
function OrderSummary({ subtotal, tax, total }: Props) {
  return <div>Total: ${total}</div>
}

// Impure: Container
function OrderSummaryContainer() {
  const { items } = useCart() // side effect
  const total = calculateTotal(items)
  return <OrderSummary total={total} />
}
```

### Hook Separation

```typescript
// Pure: calculation hook
function useOrderCalc(items: Item[]) {
  return useMemo(
    () => ({
      subtotal: items.reduce((s, i) => s + i.price, 0),
      tax: subtotal * 0.1,
    }),
    [items],
  );
}

// Impure: data hook
function useOrderData(id: string) {
  const [items, setItems] = useState([]);
  useEffect(() => api.getItems(id).then(setItems), [id]);
  return items;
}
```

## Testing Benefits

| Impure               | Pure            |
| -------------------- | --------------- |
| Needs API mocks      | Just test data  |
| Setup external state | Parameters only |
| Async/flaky          | Synchronous     |
| Complex setup        | Simple calls    |
