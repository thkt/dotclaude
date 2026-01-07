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
| --- | --- | --- |
| 1 | 30s | Write smallest failing test |
| 2 | 1min | Make it pass minimally |
| 3 | 10s | Run tests |
| 4 | 30s | Tiny refactor (if needed) |
| 5 | 20s | Commit if green |

**Why**: Bug is always in last 2-minute change. Always seconds from green.

## RGRC Checklist

Copy and track progress:

```markdown
TDD Cycle:
- [ ] Red - 失敗するテスト作成 (verify correct failure reason)
- [ ] Green - 最小限のコードで通過 (dirty OK)
- [ ] Refactor - コード改善 (keep tests green)
- [ ] Commit - 変更をコミット (all checks pass)
```

### Phase Details

| Phase | Goal | Rule |
| --- | --- | --- |
| Red | Failing test | Verify failure reason is correct |
| Green | Pass test | "You can sin" - quick/dirty OK |
| Refactor | Clean code | Apply SOLID/DRY, keep green |
| Commit | Save state | All checks pass |

## Test Design Techniques

| Technique | Use For | Example |
| --- | --- | --- |
| Equivalence Partitioning | Group inputs with same behavior | Age: <18, 18-120, >120 |
| Boundary Value | Test edges | 17, 18, 120, 121 |
| Decision Table | Complex multi-condition logic | isLoggedIn × isPremium → access |

## Coverage Goals

| Level | Target | Focus |
| --- | --- | --- |
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

## Test Priority Matrix

Not everything needs to be tested. Prioritize by impact.

### [Priority 1] Must Test

- **Business Logic**: Calculations, validation, state transitions
- **Service/Repository Layer**: Data operations beyond simple CRUD
- **Critical Paths**: Billing, authentication, data persistence
- **Edge Cases**: Boundary values, null/undefined, empty arrays

### [Priority 2] Situational

- **Utility Functions**: Only complex ones
- **Custom Hooks**: State management logic portion
- **Transformations**: Complex mapping/formatting

### [Skip] No Testing Needed

- Simple property accessors/getters
- UI layout/styling
- External library behavior verification
- Prototype/experimental code
- Simple CRUD (framework-provided)
- Config file loading

**Decision Criteria**: "If this logic breaks, will it impact users?"

## Naming Convention (Jest/Vitest)

Consistent naming makes test intent clear.

### Recommended Pattern

```typescript
describe('[TargetClass/FunctionName]', () => {
  describe('[MethodName/Scenario]', () => {
    it('when [condition], should [expected result]', () => {
      // Arrange - Act - Assert
    })
  })
})
```

### Examples

```typescript
describe('PriceCalculator', () => {
  describe('calculateTotal', () => {
    it('when empty array, should return 0', () => {
      expect(calculator.calculateTotal([])).toBe(0)
    })

    it('when discount code applied, should return discounted total', () => {
      const items = [{ price: 1000, quantity: 2 }]
      expect(calculator.calculateTotal(items, 'SAVE10')).toBe(1800)
    })

    it('when tax included, should return total with correct tax', () => {
      const items = [{ price: 1000, quantity: 1 }]
      expect(calculator.calculateTotal(items, null, { includeTax: true })).toBe(1100)
    })
  })
})
```

### Naming Guidelines

| Element | Good | Bad |
| --- | --- | --- |
| Condition | `when empty array` | `test1` |
| Expected | `should return 0` | `works correctly` |
| Context | `when discount applied` | `discount` |

**Tip**: Use descriptive names that serve as documentation

## test-generator Agent Patterns

The test-generator agent creates test scaffolding from specifications or bug descriptions.

### Pattern 1: Spec-Driven Generation (Feature Development)

**Use Case**: Generating tests from spec.md for `/code` command

```typescript
Task({
  subagent_type: "test-generator",
  description: "Generate skipped tests from specification",
  prompt: `
Feature: "${featureDescription}"
Spec: ${specContent}

Generate tests in SKIP MODE:
1. FR-xxx requirements → skipped test cases
2. Given-When-Then scenarios → skipped executable tests
3. Order tests: simple → complex (Baby Steps order)
4. Use framework-appropriate skip markers:
   - Jest/Vitest: it.skip() + // TODO: [SKIP] comment
  `
})
```

### Pattern 2: Bug-Driven Generation (Bug Fixing)

**Use Case**: Generating regression tests for `/fix` command

```typescript
Task({
  subagent_type: "test-generator",
  description: "Generate regression test for bug fix",
  prompt: `
Bug: "${bugDescription}"
Root Cause: "${rootCause}"
Fix Applied: "${fixSummary}"

Generate:
1. Test that reproduces original bug (should now pass)
2. Edge case tests related to the fix
3. Integration test if cross-component fix
  `
})
```

### Pattern 3: Coverage-Driven Generation

**Use Case**: Adding tests to improve coverage

```typescript
Task({
  subagent_type: "test-generator",
  description: "Generate tests for uncovered code paths",
  prompt: `
File: ${filePath}
Uncovered lines: ${uncoveredLines}
Existing test style: ${testStyle}

Generate tests for uncovered code paths.
Target coverage: 80%+
  `
})
```

## Framework-Specific Skip Markers

| Framework | Skip Syntax |
| --- | --- |
| Jest/Vitest | `it.skip('test', () => { // TODO: [SKIP] FR-001 })` |
| Mocha | `it.skip('test', function() { })` or `xit('test', ...)` |
| Unknown | Comment out with `// TODO: [SKIP]` marker |

## Best Practices

| Practice | Good | Bad |
| --- | --- | --- |
| Context | Specific requirements | "Generate tests" |
| Markers | Clear skip marker with FR-xxx | No marker |
| Order | Simple → Complex (Baby Steps) | Random order |
| Focus | One behavior per test | Multiple assertions |

## References

### Principles (rules/)

- [@../../rules/development/TDD_RGRC.md](../../rules/development/TDD_RGRC.md) - Full TDD methodology

### Skill References

- [@./references/tdd-rgrc.md](./references/tdd-rgrc.md) - Complete RGRC guide
- [@./references/test-design.md](./references/test-design.md) - Test design techniques
- [@./references/feature-driven.md](./references/feature-driven.md) - Feature-driven TDD workflow
- [@./references/bug-driven.md](./references/bug-driven.md) - Bug-driven TDD workflow

### Related Skills

- `applying-code-principles` - コード原則適用

### Used by Commands

- `/code` - TDD実装サイクル
- `/fix` - バグ修正のリグレッションテスト
- `/test` - テスト実行・検証
