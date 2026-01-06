# Test Generation (Phase 3.5 - Optional)

Generate additional regression tests to prevent similar bugs.

## Purpose

Use test-generator to create comprehensive test coverage for the bug and related edge cases.

## When to Use

Generate additional tests when:

- [x] Bug fix is testable (has logic)
- [x] Edge cases exist beyond initial regression test
- [x] Similar bugs possible in related code
- [x] Integration testing needed

## When to Skip

Skip test generation when:

- [ ] Documentation-only changes
- [ ] Configuration file updates
- [ ] Pure UI/CSS changes without logic
- [ ] Trivial fix with comprehensive existing tests

## Test Generation Reference

For test-generator patterns and best practices:

- [@../../../references/commands/shared/test-generation.md](~/.claude/references/commands/shared/test-generation.md) - Detailed patterns
- [@../../../skills/generating-tdd-tests/references/bug-driven.md](~/.claude/skills/generating-tdd-tests/references/bug-driven.md) - Bug-driven approach

## Using test-generator

For detailed invocation patterns:
[@~/.claude/references/commands/shared/test-generation.md#pattern-2-bug-driven-generation-bug-fixing](~/.claude/references/commands/shared/test-generation.md#pattern-2-bug-driven-generation-bug-fixing)

**Quick reference**: Use Pattern 2 (Bug-Driven Generation) with:

- Bug description and root cause
- Fix summary
- Framework and style preferences

## What to Generate

### 1. Main Regression Test

Already written in Phase 1.5, but verify it's comprehensive:

```typescript
it('when discount exceeds total, should return 0 not negative', () => {
  // ✓ Already exists from Phase 1.5
  expect(calculateTotal(100, 150)).toBe(0)
})
```

### 2. Edge Cases

Generate tests for related edge cases:

```typescript
// Generate these via test-generator:

it('handles zero price with discount', () => {
  expect(calculateTotal(0, 50)).toBe(0)
})

it('handles zero discount', () => {
  expect(calculateTotal(100, 0)).toBe(100)
})

it('handles equal price and discount', () => {
  expect(calculateTotal(100, 100)).toBe(0)
})

it('handles very large discounts', () => {
  expect(calculateTotal(100, 1000000)).toBe(0)
})
```

### 3. Integration Tests (If Needed)

If fix spans multiple components:

```typescript
it('checkout flow with large discount', () => {
  const cart = createCart([item1, item2]); // price: 100
  cart.applyDiscount(150);
  const total = cart.calculateTotal();
  expect(total).toBe(0); // ✓ Integration works
})
```

## Generated Test Characteristics

Ensure generated tests have:

- [x] **Clear names**: Describe what is being tested
- [x] **Single focus**: One behavior per test
- [x] **AAA pattern**: Arrange, Act, Assert
- [x] **Edge coverage**: Boundary conditions
- [x] **Comments**: Explain non-obvious cases

## Example: Complete Generation

### Input to test-generator

```text
Bug: "Negative total when discount > price"
Root Cause: "No Math.max check in calculateTotal"
Fix: "Added Math.max(0, result) to ensure non-negative"

Generate edge case tests.
```

### Generated Output

```typescript
describe('calculateTotal - discount edge cases', () => {
  // Main regression test (from Phase 1.5)
  it('returns 0 when discount exceeds price', () => {
    expect(calculateTotal(100, 150)).toBe(0);
  });

  // Edge cases (generated)
  it('handles zero price', () => {
    expect(calculateTotal(0, 50)).toBe(0);
  });

  it('handles zero discount', () => {
    expect(calculateTotal(100, 0)).toBe(100);
  });

  it('handles equal values', () => {
    expect(calculateTotal(100, 100)).toBe(0);
  });

  it('handles boundary conditions', () => {
    expect(calculateTotal(0.01, 0.02)).toBe(0);
    expect(calculateTotal(100, 99.99)).toBeCloseTo(0.01);
  });

  it('maintains precision', () => {
    expect(calculateTotal(10.5, 5.25)).toBe(5.25);
  });
});
```

## Verification

After generation, verify:

- [ ] All generated tests pass
- [ ] Tests are meaningful (not trivial)
- [ ] Tests add value (not duplicates)
- [ ] Tests follow project conventions
- [ ] Coverage improved

## Fast vs Thorough

### Fast (Minimal)

```typescript
// Generate 2-3 critical edge cases only
// Focus on most likely failure modes
```

### Thorough (Comprehensive)

```typescript
// Generate full edge case matrix
// Include integration tests
// Cover all boundary conditions
```

Choose based on:

- Bug severity (critical → thorough)
- Time available (urgent → fast)
- Confidence (low → thorough)

## Output Format

```markdown
Additional Tests Generated

Tests Added: 5
File: src/utils/pricing.test.ts

Coverage:
- Edge cases: [✓] Zero values, boundary conditions
- Integration: [✓] Checkout flow
- Negative cases: [✓] Invalid inputs

Status:
- All tests passing: PASS
- Coverage improved: 78% -> 85%

Next: Definition of Done
```

## Integration Points

- **Previous**: Phase 3 (Verification)
- **Next**: Completion (Definition of Done)
- **References**: shared/test-generation.md

## Related Principles

- [@../../../references/commands/shared/test-generation.md](~/.claude/references/commands/shared/test-generation.md) - Test patterns
- [@../../../skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDD fundamentals
