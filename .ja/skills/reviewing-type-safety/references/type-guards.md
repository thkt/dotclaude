# Type Guards & Discriminated Unions

## Type Guards

| Guard Type | Use Case               | Syntax                    |
| ---------- | ---------------------- | ------------------------- |
| typeof     | Primitive types        | `typeof x === 'string'`   |
| instanceof | Class instances        | `x instanceof Error`      |
| in         | Property existence     | `'radius' in shape`       |
| Predicate  | Complex type narrowing | `function isX(v): v is X` |

## Type Predicate Pattern

```typescript
// Define
function isSuccess<T>(res: Response<T>): res is SuccessResponse<T> {
  return res.success === true;
}

// Use
if (isSuccess(response)) {
  console.log(response.data); // TypeScript knows type
}
```

## Discriminated Unions

| Pattern      | Discriminant | Example                          |
| ------------ | ------------ | -------------------------------- |
| Action       | `type`       | `{ type: 'INCREMENT', payload }` |
| API Response | `success`    | `{ success: true, data }`        |
| Form State   | `status`     | `{ status: 'loading' }`          |

## Exhaustive Check Pattern

```typescript
switch (action.type) {
  case "INCREMENT":
    return state + action.payload;
  case "DECREMENT":
    return state - action.payload;
  default:
    const _exhaustive: never = action; // Compile error if case missed
    return state;
}
```

## Generic Patterns

| Pattern    | Use Case                 | Example                          |
| ---------- | ------------------------ | -------------------------------- |
| Function   | Preserve input type      | `function first<T>(arr: T[]): T` |
| Component  | Reusable typed component | `Select<T>({ value: T })`        |
| Constraint | Require interface        | `<T extends HasId>`              |

## Anti-Patterns

| Bad                      | Good                      |
| ------------------------ | ------------------------- |
| `(x as Type).prop`       | Type guard + `x.prop`     |
| Manual type checking     | Type predicate function   |
| Missing exhaustive check | `never` in switch default |

## Checklist

| Item                                   | Required |
| -------------------------------------- | -------- |
| Type predicate for complex guards      | Yes      |
| Discriminated unions for related types | Yes      |
| Exhaustive check with `never`          | Yes      |
| Avoid unsafe `as` assertions           | Yes      |
| Generics for reusable components       | Optional |
