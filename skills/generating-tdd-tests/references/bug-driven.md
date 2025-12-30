# Bug-Driven TDD Example

How `/fix` command uses TDD for bug fixes.

## Context

- **Source**: Bug description and reproduction steps
- **Approach**: Write failing test that reproduces bug
- **Tool**: Manual test first, then test-generator for regression

## Workflow

```text
1. Reproduce bug
   └─ Write failing test
   └─ Verify test fails (confirms bug exists)

2. Fix bug
   └─ Minimal implementation
   └─ Test passes

3. Prevent regression
   └─ test-generator creates additional tests
   └─ Edge cases and related scenarios
   └─ Integration tests if needed

4. All tests passing
```

## Example

```typescript
// Step 1: Write failing test FIRST
it('when discount exceeds total, should return 0 not negative', () => {
  // This was the bug: returned -50 instead of 0
  const result = calculateTotal(100, 150) // 150% discount
  expect(result).toBe(0) // Expected behavior
})

// Step 2: Verify it fails
// → Test runs, returns -50, assertion fails
// → Confirms bug is reproducible

// Step 3: Fix the code
function calculateTotal(price, discount) {
  const result = price - discount
  return Math.max(0, result) // ← Fix: ensure non-negative
}

// Step 4: Verify test passes
// → Test runs, returns 0, assertion passes

// Step 5: Generate regression tests
// → test-generator adds edge cases
it('handles zero price', () => { ... })
it('handles zero discount', () => { ... })
it('handles negative inputs', () => { ... })
```

## Key Characteristics

- **Reactive**: Bug → test → fix
- **Bug-driven**: Reproduction first
- **Regression focus**: Prevent recurrence
- **Fast iteration**: Minimal cycle time

## Detailed Walkthrough

### Phase 1: Root Cause Analysis

**Bug Report**:

```text
Issue: Shopping cart displays negative total
Reproduction:
1. Add item: price $100
2. Apply coupon: 150% discount
3. View total: Shows "-$50" instead of "$0"

Expected: Total should never be negative
Actual: Total = -$50
```

**Root Cause**:

```typescript
// Current (buggy) code:
function calculateTotal(price: number, discount: number): number {
  return price - discount  // Bad: Can return negative!
}
```

**Analysis**:

- Missing validation: No check for discount > price
- Expected behavior: Return 0 when discount exceeds price
- Fix strategy: Add Math.max(0, result)

### Phase 1.5: Write Failing Test (Red)

**Step 1: Write test that reproduces bug**

```typescript
// src/cart.test.ts
describe('calculateTotal', () => {
  it('when discount exceeds price, should return 0 not negative', () => {
    // This was the bug: returned -50 instead of 0
    const result = calculateTotal(100, 150)
    expect(result).toBe(0) // Expected: 0, Received: -50
  })
})
```

**Step 2: Run test and verify failure**

```bash
$ npm test -- cart.test.ts

FAIL  src/cart.test.ts
  ✕ when discount exceeds price, should return 0 not negative (4ms)

    expect(received).toBe(expected)

    Expected: 0
    Received: -50

      at Object.<anonymous> (src/cart.test.ts:5:30)
```

**✅ Confirmed**: Test fails for the RIGHT reason - reproduces the bug exactly.

### Phase 2: Fix the Bug (Green)

**Apply minimal fix**:

```typescript
// src/cart.ts
function calculateTotal(price: number, discount: number): number {
  const result = price - discount
  return Math.max(0, result)  // ← Fix: ensure non-negative
}
```

**Run test**:

```bash
$ npm test -- cart.test.ts

PASS  src/cart.test.ts
  ✓ when discount exceeds price, should return 0 not negative (2ms)
```

**✅ Test passes**: Bug is fixed!

### Phase 3: Verification

**Run full test suite**:

```bash
$ npm test

PASS  src/cart.test.ts
  ✓ when discount exceeds price, should return 0 not negative
PASS  src/cart.existing.test.ts
  ✓ calculates normal discount
  ✓ handles zero discount

Test Suites: 2 passed, 2 total
Tests:       3 passed, 3 total
```

**✅ No regressions**: All existing tests still pass.

### Phase 3.5: Generate Regression Tests (Optional)

**Use test-generator for additional edge cases**:

For detailed test-generator patterns, see:
[@~/.claude/references/commands/shared/test-generation.md#pattern-2-bug-driven-generation](~/.claude/references/commands/shared/test-generation.md#pattern-2-bug-driven-generation)

**Example generated tests**:

```typescript
describe('calculateTotal - edge cases', () => {
  it('returns 0 when discount exceeds price', () => {
    expect(calculateTotal(100, 150)).toBe(0)
  })

  it('handles zero price with discount', () => {
    expect(calculateTotal(0, 50)).toBe(0)
  })

  it('handles equal price and discount', () => {
    expect(calculateTotal(100, 100)).toBe(0)
  })

  // ... other edge cases
})
```

## Complete Example Flow

```typescript
// Before: Bug exists
function calculateTotal(price: number, discount: number): number {
  return price - discount  // Bad: Can return negative
}

// Phase 1.5: Write failing test
it('should return 0 when discount exceeds price', () => {
  expect(calculateTotal(100, 150)).toBe(0)  // Bad: FAILS
})

// Phase 2: Apply minimal fix
function calculateTotal(price: number, discount: number): number {
  return Math.max(0, price - discount)  // Good: Fixed
}

// Phase 3.5: Add edge cases (optional)
it('handles zero price', () => expect(calculateTotal(0, 50)).toBe(0))
it('handles large discounts', () => expect(calculateTotal(10, 1000)).toBe(0))
```

## Common Pitfalls

### Bad: Writing Test After Fixing

```typescript
// Don't do this:
// 1. Fix the code first
// 2. Then write test

// Do this:
// 1. Write failing test (Red)
// 2. Fix the code (Green)
// 3. Refactor if needed
```

**Why bad**: Test doesn't prove it catches the bug. You never saw it fail.

### Bad: Test Doesn't Reproduce Bug

```typescript
// Bad test - doesn't reproduce actual bug:
it('calculates discount correctly', () => {
  expect(calculateTotal(100, 50)).toBe(50)  // This always worked!
})

// Good test - reproduces exact bug:
it('when discount > price, returns 0 not negative', () => {
  expect(calculateTotal(100, 150)).toBe(0)  // This was failing
})
```

### Bad: Over-engineering the Fix

```typescript
// Over-engineered:
class DiscountValidator {
  validate(price: number, discount: number): ValidationResult { }
}

class TotalCalculator {
  constructor(private validator: DiscountValidator) { }
  calculate(price: number, discount: number): number { }
}

// Minimal fix (Occam's Razor):
function calculateTotal(price: number, discount: number): number {
  return Math.max(0, price - discount)
}
```

### Bad: Not Verifying Test Failure

```typescript
// Don't just run the test after fixing:
$ npm test  // Good: PASSES

// Always verify test fails BEFORE fixing:
$ npm test  // Bad: FAILS (good!)
// ... apply fix ...
$ npm test  // Good: PASSES (confirmed fix works)
```

## Decision Points

### When to Skip Phase 1.5 (Regression Test)?

**Skip when**:

- Documentation-only changes
- Pure CSS/styling without logic
- Configuration file updates
- Confidence > 0.95 AND trivial fix

**Always write test for**:

- Logic changes
- Bug fixes
- Security fixes
- Data handling

### When to Generate Additional Tests (Phase 3.5)?

**Generate when**:

- [Yes] Bug was subtle/complex
- [Yes] Multiple edge cases exist
- [Yes] Similar bugs possible
- [Yes] Critical business logic

**Skip when**:

- [No] Trivial fix with high confidence
- [No] Comprehensive tests already exist
- [No] Non-testable changes (pure UI)

### How Minimal is "Minimal Fix"?

**Minimal means**:

- [Yes] Changes only what's necessary
- [Yes] No refactoring of unrelated code
- [Yes] No "improvements" beyond the fix
- [Yes] Occam's Razor: simplest solution

**Example**:

```typescript
// Good: Minimal:
return Math.max(0, price - discount)

// Bad: Not minimal (unnecessary complexity):
if (discount > price) {
  return 0
} else if (discount === price) {
  return 0
} else {
  return price - discount
}
```

## Benefits

- **Bug reproduction**: Test proves bug exists
- **Regression prevention**: Bug can't reappear silently
- **Fast feedback**: Know immediately if fix works
- **Documentation**: Test explains expected behavior
- **Confidence**: Can refactor safely later

## Comparison with Feature-Driven TDD

| Aspect | Bug-Driven | Feature-Driven |
| --- | --- | --- |
| **Trigger** | Bug report | Specification |
| **Test state** | Active (not skipped) | Skip state initially |
| **Test count** | 1 main + edge cases | All tests generated upfront |
| **Activation** | Immediate | User-controlled |
| **Focus** | Regression prevention | Feature completion |
| **Speed** | Fast (reactive) | Methodical (proactive) |

## Used By

- `/fix` command
- Phase 1.5: Regression Test First
- Phase 3.5: Test Generation
