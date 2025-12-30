# Regression Test First (Phase 1.5)

Write a failing test that reproduces the bug before fixing it.

## Purpose

Apply TDD to bug fixing: Red (reproduce) → Green (fix) → Refactor (clean) → Commit.

## TDD Fundamentals

For TDD principles and RGRC cycle details:

- [@~/.claude/skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDD philosophy
- [@~/.claude/skills/generating-tdd-tests/references/bug-driven.md](~/.claude/skills/generating-tdd-tests/references/bug-driven.md) - Bug-driven TDD pattern
- [@~/.claude/references/commands/shared/tdd-cycle.md](~/.claude/references/commands/shared/tdd-cycle.md) - RGRC implementation

## TDD Approach to Bug Fixes

```text
1. 🔴 Red   - Write test that reproduces the bug (should FAIL)
2. ✅ Verify - Confirm test fails for the RIGHT reason
3. 🟢 Green - Implement minimal fix (test should PASS)
4. 🔵 Refactor - Clean up if needed (keep test green)
```

## Step-by-Step Process

### Step 1: Write Failing Test

Create a test that reproduces the bug exactly as reported:

```typescript
// Step 1: Write failing test FIRST
it('when discount exceeds total, should return 0 not negative', () => {
  // This was the bug: returned -50 instead of 0
  const result = calculateTotal(100, 150) // 150% discount
  expect(result).toBe(0) // Expected behavior
})
```

**Checklist**:

- [ ] Test name describes expected behavior
- [ ] Test reproduces exact bug scenario
- [ ] Assertion shows expected (correct) behavior
- [ ] Comment explains what the bug was

### Step 2: Verify Correct Failure

Run the test and confirm:

```bash
npm test -- --testNamePattern="discount exceeds total"
```

**Verify**:

- ✅ Test **fails** (proves bug exists)
- ✅ Failure reason matches bug description
- ✅ Error message is clear

**Example**:

```text
FAIL src/utils/pricing.test.ts
  ● when discount exceeds total, should return 0 not negative

    expect(received).toBe(expected)

    Expected: 0
    Received: -50
```

If test passes immediately → test doesn't reproduce bug → revise test.

### Step 3: Proceed to Fix

Once test fails correctly, proceed to Phase 2 (Implementation).

## Benefits

- **[✓] Confirms bug is reproducible**
  - No guessing if fix works
  - Clear pass/fail criteria

- **[✓] Prevents regression forever**
  - Test stays in suite
  - CI catches if bug reappears

- **[✓] Documents expected behavior**
  - Test serves as specification
  - Future developers understand intent

- **[✓] Enables confident refactoring**
  - Can improve code safely
  - Tests catch breaking changes

## When to Skip Regression Test

Skip test writing when:

### Non-testable Changes

- ❌ Documentation-only changes
- ❌ Configuration file updates
- ❌ README/comment fixes

### UI-only Fixes

- ❌ Pure CSS/styling issues without logic
- ❌ Visual alignment problems
- ❌ Animation timing tweaks

### Trivial & High-Confidence

- ❌ Confidence > 0.95 AND trivial fix
- ❌ Obvious typo in code
- ❌ Missing null check with clear solution

**Important**: Even when skipping, document why:

```typescript
// Fix: Added null check for edge case
// Skipped test: Trivial fix, confidence 0.98
if (!user) return null;
```

## Example: Complete Cycle

### Before (Bug Exists)

```typescript
// Code with bug
function calculateTotal(price, discount) {
  return price - discount; // ❌ Can return negative!
}

// No test exists
```

### Red Phase

```typescript
// Write failing test
it('should not return negative total', () => {
  const result = calculateTotal(100, 150);
  expect(result).toBe(0); // ❌ FAILS: Expected 0, got -50
})
```

### Green Phase (Implementation)

```typescript
// Minimal fix
function calculateTotal(price, discount) {
  const result = price - discount;
  return Math.max(0, result); // ✅ Fix: Ensure non-negative
}

// Test now passes ✅
```

### Refactor Phase (Optional)

```typescript
// Clean up if needed
function calculateTotal(price, discount) {
  return Math.max(0, price - discount); // Cleaner
}

// Test still passes ✅
```

## Integration with TDD Cycle

The regression test is the **Red phase** of RGRC:

```text
Phase 1.5: Regression Test (You are here)
  ↓ Red: Test fails
Phase 2: Implementation
  ↓ Green: Test passes
Phase 3: Verification
  ↓ Refactor: Clean code
Phase 3.5: Test Generation (Optional)
  ↓ Additional tests
Definition of Done
```

## Output Format

```markdown
✅ Regression Test Written

📝 Test: [test name]
📁 File: [path/to/test.ts:line]
🔴 Status: FAILING (as expected)
🎯 Reproduces: [bug description]

Next: Implement fix (Phase 2)
```

## References

- [@~/.claude/skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDD fundamentals
- [@~/.claude/references/commands/shared/tdd-cycle.md](~/.claude/references/commands/shared/tdd-cycle.md) - RGRC details
- [@~/.claude/references/commands/shared/test-generation.md](~/.claude/references/commands/shared/test-generation.md) - Test patterns
