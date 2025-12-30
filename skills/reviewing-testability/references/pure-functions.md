# Pure Functions - Side Effect Isolation

## What Makes a Function Pure?

A pure function:

1. **Same input → same output** (deterministic)
2. **No side effects** (doesn't modify external state)
3. **Doesn't depend on external state** (except parameters)

## Pure vs Impure

```typescript
// Bad: Impure: Depends on external state
let taxRate = 0.1
function calculateTotal(price: number): number {
  return price * (1 + taxRate) // Depends on external taxRate
}

// Good: Pure: All inputs are parameters
function calculateTotal(price: number, taxRate: number): number {
  return price * (1 + taxRate)
}
```

```typescript
// Bad: Impure: Side effect (modifies external state)
function addItem(cart: Item[], item: Item): void {
  cart.push(item) // Mutates input
}

// Good: Pure: Returns new state
function addItem(cart: Item[], item: Item): Item[] {
  return [...cart, item] // Returns new array
}
```

```typescript
// Bad: Impure: Side effect (API call)
function getDiscountedPrice(userId: string, price: number): number {
  const user = api.getUser(userId) // Side effect!
  return price * (1 - user.discount)
}

// Good: Pure: Receives user as parameter
function getDiscountedPrice(discount: number, price: number): number {
  return price * (1 - discount)
}
```

## Separating Pure from Impure

### Pattern: Core Logic as Pure Function

```typescript
// Pure: Business logic
function calculateDiscount(purchaseCount: number): number {
  if (purchaseCount > 100) return 0.20
  if (purchaseCount > 50) return 0.15
  if (purchaseCount > 10) return 0.10
  return 0
}

// Impure: Data fetching (isolated)
async function getUserDiscount(userId: string): Promise<number> {
  const history = await api.getPurchaseHistory(userId)
  return calculateDiscount(history.length)
}

// Test pure function easily
expect(calculateDiscount(101)).toBe(0.20)
expect(calculateDiscount(51)).toBe(0.15)
expect(calculateDiscount(11)).toBe(0.10)
expect(calculateDiscount(5)).toBe(0)
```

### Pattern: React Component Separation

```typescript
// Pure: Presentational component
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
      <div>Subtotal: ${subtotal}</div>
      <div>Tax: ${tax}</div>
      <div>Total: ${total}</div>
    </div>
  )
}

// Impure: Container with side effects
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

### Pattern: Custom Hook Separation

```typescript
// Pure: Logic hook (no side effects)
function useOrderCalculations(items: Item[]) {
  const subtotal = useMemo(() =>
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  )
  const tax = subtotal * 0.1
  const total = subtotal + tax

  return { subtotal, tax, total }
}

// Impure: Data hook (side effects)
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

// Combined in component
function OrderPage({ orderId }: { orderId: string }) {
  const { items, loading } = useOrderData(orderId)
  const calculations = useOrderCalculations(items)

  if (loading) return <Spinner />
  return <OrderSummary items={items} {...calculations} />
}
```

## Benefits for Testing

| Impure Code | Pure Code |
| --- | --- |
| Need mocks for API | Just call with test data |
| Setup external state | Pass state as parameter |
| Mock timers | Time as parameter |
| Flaky async tests | Synchronous tests |

## Checklist

- [ ] Business logic extracted to pure functions
- [ ] Side effects isolated to specific functions/hooks
- [ ] No mutation of input parameters
- [ ] Presentational components are pure
- [ ] Time/date as injectable parameters
- [ ] Random values as injectable parameters
