---
name: generating-tdd-tests
description: >
  TDD with RGRC cycle and Baby Steps methodology.
  Use when implementing features with test-driven development, following RGRC cycle,
  or when user mentions TDD, テスト駆動, Red-Green-Refactor, Baby Steps.
allowed-tools: [Read, Write, Edit, Grep, Glob, Task]
context: fork
user-invocable: false
---

# TDD Test Generation

## RGRC Cycle

| Phase    | Goal         | Rule                     |
| -------- | ------------ | ------------------------ |
| Red      | Failing test | Verify failure reason    |
| Green    | Pass test    | "You can sin" - dirty OK |
| Refactor | Clean code   | Keep tests green         |
| Commit   | Save state   | All checks pass          |

## Baby Steps (2-min cycle)

30s: Write failing test → 1min: Make pass → 10s: Run tests → 30s: Tiny refactor → 20s: Commit if green

## Test Design

| Technique                | Use For               | Example                |
| ------------------------ | --------------------- | ---------------------- |
| Equivalence Partitioning | Group same behavior   | Age: <18, 18-120       |
| Boundary Value           | Test edges            | 17, 18, 120, 121       |
| Decision Table           | Multi-condition logic | isLoggedIn × isPremium |

## Coverage

| Level | Target | Focus              |
| ----- | ------ | ------------------ |
| C0    | 90%    | All lines executed |
| C1    | 80%    | All branches taken |

## Naming

| Level | Pattern                                          |
| ----- | ------------------------------------------------ |
| Suite | `describe("[Target]", ...)`                      |
| Group | `describe("[Method]", ...)`                      |
| Test  | `it("when [condition], should [expected]", ...)` |

## Framework Detection

| Condition          | Framework |
| ------------------ | --------- |
| `vitest` in deps   | Vitest    |
| `jest` in deps     | Jest      |
| `bun` as runtime   | Bun test  |
| No framework found | Vitest    |

## References

| Topic          | File                                  |
| -------------- | ------------------------------------- |
| Feature-driven | `references/feature-driven.md`        |
| Bug-driven     | `references/bug-driven.md`            |
| Flaky tests    | `references/flaky-test-management.md` |
