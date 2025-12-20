---
name: generating-tdd-tests
description: >
  TDD with RGRC cycle and Baby Steps methodology. Triggers: TDD, テスト駆動開発,
  Red-Green-Refactor, Baby Steps, test generation, テスト生成, テスト設計,
  テストケース, boundary value, 境界値分析, coverage, カバレッジ, unit test
allowed-tools: Read, Write, Edit, Grep, Glob, Task
---

# TDD Test Generation

## Purpose

Systematic Test-Driven Development combining RGRC cycle, Baby Steps, and test design techniques.

## Baby Steps - 2-Minute Cycle

**"Make the smallest possible change at each step"** - t_wada

| Step | Time | Action |
|------|------|--------|
| 1 | 30s | Write smallest failing test |
| 2 | 1min | Make it pass minimally |
| 3 | 10s | Run tests |
| 4 | 30s | Tiny refactor (if needed) |
| 5 | 20s | Commit if green |

**Why**: Bug is always in last 2-minute change. Always seconds from green.

## RGRC Checklist

Copy and track progress:

```
TDD Cycle:
- [ ] Red - 失敗するテスト作成 (verify correct failure reason)
- [ ] Green - 最小限のコードで通過 (dirty OK)
- [ ] Refactor - コード改善 (keep tests green)
- [ ] Commit - 変更をコミット (all checks pass)
```

### Phase Details

| Phase | Goal | Rule |
|-------|------|------|
| Red | Failing test | Verify failure reason is correct |
| Green | Pass test | "You can sin" - quick/dirty OK |
| Refactor | Clean code | Apply SOLID/DRY, keep green |
| Commit | Save state | All checks pass |

## Test Design Techniques

| Technique | Use For | Example |
|-----------|---------|---------|
| Equivalence Partitioning | Group inputs with same behavior | Age: <18, 18-120, >120 |
| Boundary Value | Test edges | 17, 18, 120, 121 |
| Decision Table | Complex multi-condition logic | isLoggedIn × isPremium → access |

## Coverage Goals

| Level | Target | Focus |
|-------|--------|-------|
| C0 (Statement) | 80% | All lines executed |
| C1 (Branch) | 70% | All branches taken |

**Why these targets**: Cost-benefit balance, focus on critical paths.

## AAA Pattern

```typescript
test('descriptive name', () => {
  // Arrange - Setup
  // Act - Execute
  // Assert - Verify
})
```

## When NOT to Use TDD

- Prototypes (throwaway code)
- External API integration (use mocks)
- Simple one-off scripts
- UI experiments (visual first)

## References

- [@./references/tdd-rgrc.md] - Complete RGRC guide
- [@./references/test-design.md] - Test design techniques
- [@~/.claude/rules/development/TDD_RGRC.md]
