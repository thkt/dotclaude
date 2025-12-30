# Type Coverage - Explicit Types & Avoiding Any

## Type Coverage Goal

Aim for 95%+ type coverage. Every function, parameter, and data structure should have explicit types.

## Avoiding Any

### Why `any` is Dangerous

```typescript
// Bad: Dangerous: any disables all type checking
function processUser(data: any) {
  return data.name.toUpperCase() // No compile-time error, runtime crash
}

// Good: Safe: TypeScript catches the error
function processUser(data: User) {
  return data.name.toUpperCase() // Compile-time check
}
```

### Using `unknown` Instead

```typescript
// Good: Safe: unknown requires type checking before use
function processUnknownData(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String((data as { value: unknown }).value)
  }
  throw new Error('Invalid data format')
}
```

### When `any` is Acceptable

Rare cases where `any` may be justified:

1. **Third-party library without types** - Add `// TODO: Add types when @types/lib available`
2. **Migration from JavaScript** - Temporary, with clear migration plan
3. **Complex generic constraints** - When TypeScript's type system can't express it

Always document:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Reason: External API returns dynamic structure, validated at runtime
const response: any = await externalApi.fetch()
```

## Explicit Type Annotations

### Function Return Types

```typescript
// Bad: Poor: Implicit return type
function getUser(id: string) {
  return { name: 'John', age: 30 }
}

// Good: Good: Explicit return type
function getUser(id: string): User {
  return { name: 'John', age: 30 }
}

// Good: Good: Async functions
async function fetchUser(id: string): Promise<User> {
  const response = await api.get(`/users/${id}`)
  return response.data
}
```

### Interface Definitions

```typescript
// Bad: Poor: Inline object types
function createOrder(item: { id: string; price: number }) { }

// Good: Good: Named interface
interface OrderItem {
  id: string
  price: number
  quantity: number
}

function createOrder(item: OrderItem): Order { }
```

## Type Inference Balance

Let TypeScript infer when obvious:

```typescript
// Good: Good: Let TS infer simple cases
const count = 0                    // number
const items = ['a', 'b']           // string[]
const user = { name: 'John' }      // { name: string }

// Good: Good: Explicit when not obvious
const cache: Map<string, User> = new Map()
const config: AppConfig = loadConfig()
```

## Checklist

- [ ] All exported functions have explicit return types
- [ ] All function parameters are typed
- [ ] No `any` without documented justification
- [ ] `unknown` used instead of `any` for unknown data
- [ ] Interface/type defined for all data structures
- [ ] Type inference used for obvious cases only
