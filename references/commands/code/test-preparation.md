# Test Preparation (Phase 0 - Interactive Test Activation)

This module handles pre-TDD test generation from specifications.

## Purpose

Generate test cases in **skip state** from specification, then activate one-by-one with user confirmation for true Baby Steps TDD.

## TDD Fundamentals Reference

For core TDD concepts and test generation patterns:

- [@../../../skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDD philosophy
- [@../../../skills/generating-tdd-tests/references/feature-driven.md](~/.claude/skills/generating-tdd-tests/references/feature-driven.md) - Feature-driven pattern
- [@../../../references/commands/shared/test-generation.md](~/.claude/references/commands/shared/test-generation.md) - Test generation patterns

## When to Use

When spec.md exists and contains FR-xxx requirements or Given-When-Then scenarios.

## Step 1: Generate Skipped Tests

Use test-generator with skip mode to create test scaffold.

**For detailed test-generator patterns**:
[@../../../references/commands/shared/test-generation.md](~/.claude/references/commands/shared/test-generation.md#pattern-1-spec-driven-generation-feature-development)

**Quick invocation**:

```typescript
Task({
  subagent_type: "test-generator",
  description: "Generate skipped tests from specification",
  prompt: `
Feature: "${featureDescription}"
Spec: ${specContent}

Generate tests in SKIP MODE:
1. FR-xxx requirements → skipped test cases [✓]
2. Given-When-Then scenarios → skipped executable tests [✓]
3. Order tests: simple → complex (Baby Steps order) [→]
4. Use framework-appropriate skip markers:
   - Jest/Vitest: it.skip() + // TODO: [SKIP] comment
   - Unknown: Comment out + // TODO: [SKIP] marker

Output: Test file with ALL tests in skip state.
Include activation order recommendation.
  `
})
```

**See shared/test-generation.md for**:

- Framework-specific skip markers
- Best practices
- Common issues and solutions

## Step 2: Display Test Queue

After generation, display the test activation queue:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test Queue (Baby Steps Order)

| # | Test Name | Status | Complexity |
|---|-----------|--------|------------|
| 1 | handles zero input | SKIP | Simple |
| 2 | calculates basic case | SKIP | Basic |
| 3 | applies threshold logic | SKIP | Medium |
| 4 | handles edge cases | SKIP | Complex |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 3: Interactive Activation Loop

For each test in the queue, prompt user before activation:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RGRC Cycle 1/4

Activate the next test?

Test: "handles zero input"
File: src/utils/discount.test.ts:15
From: FR-001 (Zero purchase handling)

```typescript
it('handles zero input', () => {
  expect(calculateDiscount(0)).toBe(0.1)
})
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Y] Activate and enter Red phase
[S] Skip to next test
[Q] Quit test generation

```markdown

## Step 4: Activate and Enter Red Phase

On user confirmation (Y):

1. **Remove skip marker** from the test
2. **Run test** → Verify it fails (Red phase)
3. **Proceed to Green phase** → Implement minimal code
4. **Refactor if needed**
5. **Return to Step 3** for next test

```typescript
// Before activation:
it.skip('handles zero input', () => {
  // TODO: [SKIP] FR-001
  expect(calculateDiscount(0)).toBe(0.1)
})

// After activation:
it('handles zero input', () => {
  expect(calculateDiscount(0)).toBe(0.1)
})
```

## Progress Tracking

Display progress after each cycle:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Progress: 2/4 tests complete

| # | Test Name | Status |
|---|-----------|--------|
| 1 | handles zero input | PASS |
| 2 | calculates basic case | PASS |
| 3 | applies threshold logic | SKIP |
| 4 | handles edge cases | SKIP |

Red -> Green -> Refactor -> Commit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Benefits

- **True Baby Steps**: One test at a time, user-controlled pace
- **Spec-driven**: Tests derived from Given-When-Then scenarios
- **Confirmation before action**: No surprises, intentional progress
- **Clear progress**: Always know where you are in the cycle

## Integration with TDD

```text
Phase 0: test-generator creates ALL tests in skip state
  ↓
Loop:
  ├─ Display next skipped test
  ├─ Ask: "Activate this test?" (Y/S/Q)
  ├─ If Y:
  │   ├─ Remove skip marker
  │   ├─ Red: Run test (fails)
  │   ├─ Green: Implement
  │   ├─ Refactor: Clean up
  │   └─ Commit: Save state
  └─ Next test
  ↓
All tests activated and passing
```
