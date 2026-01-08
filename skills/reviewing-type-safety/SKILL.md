---
name: reviewing-type-safety
description: >
  TypeScript type safety patterns and best practices for maximum type coverage.
  Triggers: 型安全, type safety, any, unknown, 型推論, 型ガード, type guard,
  discriminated union, 判別可能なUnion, strictNullChecks, 型定義, 型カバレッジ,
  TypeScript, 暗黙のany, implicit any, 型アサーション, type assertion.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
agent: type-safety-reviewer
user-invocable: false
---

# Type Safety Review - TypeScript Best Practices

Target: Maximum type safety with minimal type gymnastics.

## Type Safety Metrics

| Context         | Target             | Warning        |
| --------------- | ------------------ | -------------- |
| Type coverage   | 95%+               | < 90%          |
| Any usage       | 0 (justified only) | > 5 instances  |
| Type assertions | Minimal            | > 10 instances |
| Implicit any    | 0                  | Any > 0        |
| Strict mode     | All enabled        | Any disabled   |

## Section-Based Loading

| Section  | File                          | Focus                           | Triggers                   |
| -------- | ----------------------------- | ------------------------------- | -------------------------- |
| Coverage | `references/type-coverage.md` | Explicit types, avoiding any    | any, unknown, 型カバレッジ |
| Guards   | `references/type-guards.md`   | Narrowing, discriminated unions | 型ガード, type guard       |
| Strict   | `references/strict-mode.md`   | tsconfig, React types           | strictNullChecks, React    |

## Quick Checklist

### Type Coverage

- [ ] All functions have explicit return types
- [ ] All parameters are typed (no implicit any)
- [ ] Interface/type definitions for all data structures
- [ ] No `any` without explicit justification

### Type Guards & Narrowing

- [ ] Type predicates for union types (`is` functions)
- [ ] Discriminated unions for related types
- [ ] Exhaustive checking with `never`
- [ ] Avoid unsafe type assertions (`as`)

### Strict Mode

- [ ] `strictNullChecks: true`
- [ ] `noImplicitAny: true`
- [ ] `strictFunctionTypes: true`
- [ ] React components extend proper HTML attributes

## Key Principles

| Principle      | Application                                 |
| -------------- | ------------------------------------------- |
| Fail Fast      | Catch errors at compile-time, not runtime   |
| Let TS Infer   | Don't over-type what's already clear        |
| Types as Docs  | Good types serve as documentation           |
| Prefer unknown | Use `unknown` over `any` for safer handling |

## Common Patterns

### Type Guard Function

```typescript
function isSuccess<T>(response: Response<T>): response is SuccessResponse<T> {
  return response.success === true;
}
```

### Discriminated Union

```typescript
type Action =
  | { type: "INCREMENT"; payload: number }
  | { type: "DECREMENT"; payload: number }
  | { type: "RESET" };

// Exhaustive check
function reducer(action: Action): number {
  switch (action.type) {
    case "INCREMENT":
      return action.payload;
    case "DECREMENT":
      return -action.payload;
    case "RESET":
      return 0;
    default:
      const _exhaustive: never = action;
      return _exhaustive;
  }
}
```

### Generic Component

```typescript
interface SelectProps<T> {
  value: T;
  options: T[];
  onChange: (value: T) => void;
}

function Select<T>({ value, options, onChange }: SelectProps<T>) {
  /* ... */
}
```

## References

### Core Principles

- [@../../skills/applying-code-principles/SKILL.md](../../skills/applying-code-principles/SKILL.md) - Don't over-type
- [@../../skills/applying-code-principles/SKILL.md](../../skills/applying-code-principles/SKILL.md) - Type interfaces follow ISP

### Related Skills

- `applying-code-principles` - General code quality principles
- `generating-tdd-tests` - Type-safe test patterns

### Used by Agents

- `type-safety-reviewer` - Primary consumer of this skill
