# Test Generation Patterns

## Overview

| Pattern         | Use Case          | Test State |
| --------------- | ----------------- | ---------- |
| Spec-Driven     | Feature (`/code`) | Skip mode  |
| Bug-Driven      | Bug fix (`/fix`)  | Active     |
| Coverage-Driven | Improve coverage  | Active     |

## Framework Skip Markers

| Framework   | Skip Syntax                                         |
| ----------- | --------------------------------------------------- |
| Jest/Vitest | `it.skip('test', () => { // TODO: [SKIP] FR-001 })` |
| Mocha       | `it.skip()` or `xit()`                              |
| Unknown     | `// TODO: [SKIP]` marker                            |

## Test Design

| Technique                | Use For                    | Example                         |
| ------------------------ | -------------------------- | ------------------------------- |
| Equivalence Partitioning | Group same-behavior inputs | Age: <18, 18-120, >120          |
| Boundary Value           | Test edges                 | 17, 18, 120, 121                |
| Decision Table           | Multi-condition            | isLoggedIn × isPremium → access |

## AAA Pattern

```typescript
test("name", () => {
  // Arrange - Setup
  // Act - Execute
  // Assert - Verify
});
```

## Naming Convention

```typescript
describe("[Target]", () => {
  it("when [condition], should [result]", () => {});
});
```

## Coverage Goals

| Level          | Target |
| -------------- | ------ |
| C0 (Statement) | 90%    |
| C1 (Branch)    | 80%    |

## Test Priority

| Priority    | What                                                 |
| ----------- | ---------------------------------------------------- |
| Must Test   | Business logic, services, critical paths, edge cases |
| Situational | Complex utils, custom hooks, transformations         |
| Skip        | Simple accessors, UI layout, external lib behavior   |
