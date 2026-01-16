# Type Coverage

Target: 95%+ type coverage.

## Avoiding Any

| Pattern      | Problem              | Solution                |
| ------------ | -------------------- | ----------------------- |
| `any` param  | No type checking     | Use specific type       |
| Implicit any | Hidden type issues   | Add explicit annotation |
| `any` return | Type loss propagates | Define return type      |

### When Any is Acceptable

| Case                | Requirement          |
| ------------------- | -------------------- |
| No @types available | Add TODO comment     |
| JS migration        | Clear migration plan |
| Complex generics    | Document reason      |

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Reason: External API returns dynamic structure
const response: any = await externalApi.fetch();
```

## Explicit Types

| Rule             | Example                                    |
| ---------------- | ------------------------------------------ |
| Function returns | `function getUser(): User {}`              |
| Async functions  | `async function fetch(): Promise<User> {}` |
| Named interfaces | `interface OrderItem { ... }` vs inline    |

## Type Inference

| Use Inference         | Use Explicit                                 |
| --------------------- | -------------------------------------------- |
| `const count = 0`     | `const cache: Map<string, User> = new Map()` |
| `const items = ['a']` | `const config: AppConfig = loadConfig()`     |
| Simple assignments    | Complex/generic types                        |

## Checklist

| Check              | Requirement              |
| ------------------ | ------------------------ |
| Exported functions | Explicit return types    |
| Parameters         | All typed                |
| Any usage          | Documented justification |
| Unknown data       | Use `unknown` not `any`  |
| Data structures    | Interface/type defined   |
