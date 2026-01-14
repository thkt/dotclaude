---
name: reviewing-type-safety
description: TypeScript type safety patterns and best practices for maximum type coverage.
allowed-tools: [Read, Grep, Glob, Task]
agent: type-safety-reviewer
user-invocable: false
---

# Type Safety Review

Target: Maximum type safety with minimal type gymnastics.

## Metrics

| Context         | Target  | Warning        |
| --------------- | ------- | -------------- |
| Type coverage   | 95%+    | < 90%          |
| Any usage       | 0       | > 5 instances  |
| Type assertions | Minimal | > 10 instances |
| Implicit any    | 0       | Any > 0        |
| Strict mode     | All on  | Any disabled   |

## Section-Based Loading

| Section  | File                          | Focus                    |
| -------- | ----------------------------- | ------------------------ |
| Coverage | `references/type-coverage.md` | Avoiding any             |
| Guards   | `references/type-guards.md`   | Narrowing, discriminated |
| Strict   | `references/strict-mode.md`   | tsconfig, React types    |

## Quick Checklist

- [ ] All functions have explicit return types
- [ ] All parameters typed (no implicit any)
- [ ] Interface/type for all data structures
- [ ] No `any` without justification
- [ ] Type predicates for union types
- [ ] Exhaustive checking with `never`
- [ ] Avoid unsafe `as` assertions

## Key Principles

| Principle      | Application                  |
| -------------- | ---------------------------- |
| Fail Fast      | Catch at compile-time        |
| Let TS Infer   | Don't over-type what's clear |
| Types as Docs  | Good types = documentation   |
| Prefer unknown | Use `unknown` over `any`     |

## References

- [@./references/result-type.md] - Result type error handling
