# Result Type Error Handling

**Principle**: Enforce error handling through types, not code review

## Pattern

| Type         | Meaning         | Caller Action   |
| ------------ | --------------- | --------------- |
| `Ok<T>`      | Success         | Use value       |
| `Err<Error>` | Failure         | **Must handle** |
| `Err<null>`  | Already handled | Optional        |

## Type Definition

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

## When to Apply

| Scenario           | Approach           |
| ------------------ | ------------------ |
| API calls          | Always Result type |
| Form validation    | Result with errors |
| Internal utilities | throw/catch OK     |

## Enforcement

| Tool       | Rule                           |
| ---------- | ------------------------------ |
| ESLint     | `eslint-plugin-return-type`    |
| TypeScript | Exhaustive checks with `never` |
