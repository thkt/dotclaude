---
name: reviewing-testability
description: Testable code design patterns for TypeScript/React applications.
allowed-tools: [Read, Grep, Glob, Task]
agent: testability-reviewer
user-invocable: false
---

# Testability Review

Target: Code that is easy to test without complex mocking.

## Testability Indicators

| Indicator       | Good                    | Warning          |
| --------------- | ----------------------- | ---------------- |
| Mock complexity | Simple stubs            | Deep mock chains |
| Test setup      | < 10 lines              | > 30 lines       |
| Dependencies    | Explicit (params/props) | Hidden (imports) |
| Side effects    | Isolated                | Mixed with logic |
| State           | Predictable             | Global/mutable   |

## Section-Based Loading

| Section | File                                 | Focus                   |
| ------- | ------------------------------------ | ----------------------- |
| DI      | `references/dependency-injection.md` | Injectable dependencies |
| Pure    | `references/pure-functions.md`       | Side effect isolation   |
| Mock    | `references/mock-friendly.md`        | Interfaces, factories   |

## Quick Checklist

- [ ] Dependencies are injectable
- [ ] Clear separation: pure vs impure
- [ ] Presentational components are pure
- [ ] Side effects isolated in hooks/containers
- [ ] No global mutable state

## Key Principles

| Principle             | Application              |
| --------------------- | ------------------------ |
| DIP (SOLID)           | Depend on abstractions   |
| Pure Functions        | Same input = same output |
| Explicit Dependencies | Pass as parameters       |
| Single Responsibility | One reason to test       |
