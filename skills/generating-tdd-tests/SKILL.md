---
name: generating-tdd-tests
description: TDD with RGRC cycle and Baby Steps methodology.
allowed-tools: [Read, Write, Edit, Grep, Glob, Task]
user-invocable: false
context: fork
---

# TDD Test Generation

Systematic TDD combining RGRC cycle, Baby Steps, and test design.

## Baby Steps - 2-Minute Cycle

| Step | Time | Action             |
| ---- | ---- | ------------------ |
| 1    | 30s  | Write failing test |
| 2    | 1min | Make it pass       |
| 3    | 10s  | Run tests          |
| 4    | 30s  | Tiny refactor      |
| 5    | 20s  | Commit if green    |

**Why**: Bug is always in last 2-minute change.

## RGRC Cycle

| Phase    | Goal         | Rule                     |
| -------- | ------------ | ------------------------ |
| Red      | Failing test | Verify failure reason    |
| Green    | Pass test    | "You can sin" - dirty OK |
| Refactor | Clean code   | Keep tests green         |
| Commit   | Save state   | All checks pass          |

## Test Design Techniques

| Technique                | Use For               | Example                |
| ------------------------ | --------------------- | ---------------------- |
| Equivalence Partitioning | Group same behavior   | Age: <18, 18-120       |
| Boundary Value           | Test edges            | 17, 18, 120, 121       |
| Decision Table           | Multi-condition logic | isLoggedIn × isPremium |

## Coverage Goals

| Level | Target | Focus              |
| ----- | ------ | ------------------ |
| C0    | 90%    | All lines executed |
| C1    | 80%    | All branches taken |

## Test Priority

### Must Test

- Business Logic, Service/Repository Layer, Critical Paths, Edge Cases

### Skip

- Simple accessors, UI styling, External library verification, Config loading

## AAA Pattern

```typescript
test("descriptive name", () => {
  // Arrange - Setup
  // Act - Execute
  // Assert - Verify
});
```

## Naming Convention

```typescript
describe("[Target]", () => {
  describe("[Method]", () => {
    it("when [condition], should [expected]", () => {});
  });
});
```

## References

- [@./references/test-design.md] - Test design techniques
- [@./references/feature-driven.md] - Feature-driven TDD
- [@./references/bug-driven.md] - Bug-driven TDD
