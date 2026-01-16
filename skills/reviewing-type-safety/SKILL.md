---
name: reviewing-type-safety
description: >
  TypeScript type safety patterns and best practices for maximum type coverage.
  Triggers: TypeScript, type safety, any, 型安全, 型カバレッジ, strict mode.
allowed-tools: [Read, Grep, Glob, Task]
agent: type-safety-reviewer
user-invocable: false
---

# Type Safety Review

## Detection

| ID  | Pattern                       | Fix                           |
| --- | ----------------------------- | ----------------------------- |
| TS1 | `any`                         | `unknown` + type guard        |
| TS1 | Implicit any                  | Explicit type annotation      |
| TS2 | `value as Type`               | Type guard function           |
| TS2 | `value!` (non-null assertion) | Explicit null check           |
| TS3 | `function fn(data)` (untyped) | `function fn(data: Type)`     |
| TS3 | Missing return type           | Explicit `: ReturnType`       |
| TS4 | `default:` without exhaustive | `default: assertNever(value)` |

## Criteria

Type coverage >= 95%. Any usage = 0. Strict mode all enabled.

## References

| Topic    | File                          |
| -------- | ----------------------------- |
| Coverage | `references/type-coverage.md` |
| Guards   | `references/type-guards.md`   |
| Strict   | `references/strict-mode.md`   |
| Result   | `references/result-type.md`   |
