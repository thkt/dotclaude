---
name: use-context-reviewer-strictness
description: >
  TypeScript type safety review. Use when: type safety, any, 型安全,
  型カバレッジ, strict mode. Do NOT use for testability
  (use-context-reviewer-testability), security (use-context-reviewer-security), or readability
  (use-context-reviewer-readability).
allowed-tools: [Read, Grep, Glob, Task]
agent: reviewer-strictness
context: fork
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
| TS5 | `strictNullChecks: false`     | Enable in tsconfig            |
| TS5 | `noImplicitAny: false`        | Enable in tsconfig            |

## Criteria

Type coverage >= 95%. Any usage = 0. Strict mode all enabled.

## References

| Topic    | File                                              |
| -------- | ------------------------------------------------- |
| Coverage | `${CLAUDE_SKILL_DIR}/references/type-coverage.md` |
| Guards   | `${CLAUDE_SKILL_DIR}/references/type-guards.md`   |
| Strict   | `${CLAUDE_SKILL_DIR}/references/strict-mode.md`   |
| Result   | `${CLAUDE_SKILL_DIR}/references/result-type.md`   |
