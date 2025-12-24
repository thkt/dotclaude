# Test Generation Patterns

Common patterns for using the test-generator agent.

## Purpose

Standardized approaches for generating tests from different sources.

## Prerequisites

Understanding of TDD fundamentals:
[@~/.claude/skills/tdd-fundamentals/SKILL.md](~/.claude/skills/tdd-fundamentals/SKILL.md)

## test-generator Agent

The `test-generator` agent creates test scaffolding from specifications or bug descriptions.

### Basic Invocation

```typescript
Task({
  subagent_type: "test-generator",
  model: "haiku",  // Fast model for test generation
  description: "Generate tests from [source]",
  prompt: `[detailed prompt]`
})
```

## Pattern 1: Spec-Driven Generation (Feature Development)

**Use Case**: Generating tests from spec.md for `/code` command

**Characteristics**:

- All tests in skip state initially
- User activates one-by-one
- Ordered simple → complex (Baby Steps)

**Prompt Template**:

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

**Example Output**:

```typescript
// Generated from FR-001: User Registration

it.skip('validates email format', () => {
  // TODO: [SKIP] FR-001
  expect(validateEmail('test@example.com')).toBe(true)
})

it.skip('rejects invalid email', () => {
  // TODO: [SKIP] FR-001
  expect(validateEmail('invalid')).toBe(false)
})

// Activation order: 1 → 2 (simple → complex)
```

## Pattern 2: Bug-Driven Generation (Bug Fixing)

**Use Case**: Generating regression tests for `/fix` command

**Characteristics**:

- Tests are active (not skipped)
- Focus on bug reproduction
- Include edge cases

**Prompt Template**:

```typescript
Task({
  subagent_type: "test-generator",
  description: "Generate regression test for bug fix",
  prompt: `
Bug: "${bugDescription}"
Root Cause: "${rootCause}"
Fix Applied: "${fixSummary}"

Generate:
1. [✓] Test that reproduces original bug (should now pass)
2. [→] Edge case tests related to the fix
3. [→] Integration test if cross-component fix

Return test code ready to add to test suite.
  `
})
```

**Example Output**:

```typescript
// Regression test for: Negative total when discount > price

describe('calculateTotal - discount edge cases', () => {
  it('returns 0 when discount exceeds price', () => {
    // Bug: returned -50 instead of 0
    expect(calculateTotal(100, 150)).toBe(0)
  })

  it('handles zero price correctly', () => {
    expect(calculateTotal(0, 50)).toBe(0)
  })

  it('handles zero discount correctly', () => {
    expect(calculateTotal(100, 0)).toBe(100)
  })
})
```

## Pattern 3: Coverage-Driven Generation

**Use Case**: Adding tests to improve coverage

**Characteristics**:

- Target specific untested code paths
- Focus on edge cases
- Maintain existing test style

**Prompt Template**:

```typescript
Task({
  subagent_type: "test-generator",
  description: "Generate tests for uncovered code paths",
  prompt: `
File: ${filePath}
Uncovered lines: ${uncoveredLines}
Existing test style: ${testStyle}

Generate tests for uncovered code paths:
1. Identify edge cases not currently tested
2. Match existing test naming conventions
3. Use same assertion style as existing tests

Target coverage: 80%+
  `
})
```

## Framework-Specific Skip Markers

### Jest / Vitest

```typescript
// Skip single test
it.skip('test name', () => { })

// Skip test suite
describe.skip('suite name', () => { })

// Comment marker for tracking
it.skip('test name', () => {
  // TODO: [SKIP] FR-001
})
```

### Mocha

```typescript
// Skip with .skip
it.skip('test name', function() { })

// Skip with xit
xit('test name', function() { })
```

### Unknown Framework

```typescript
// Comment out + marker
// it('test name', () => {
//   // TODO: [SKIP] FR-001
//   expect(true).toBe(true)
// })
```

## Integration with Commands

### `/code` Usage

1. **Phase 0**: Generate all tests in skip state
2. **Interactive**: User activates tests one-by-one
3. **RGRC**: Each activation triggers Red-Green-Refactor-Commit

See: [@~/.claude/skills/tdd-fundamentals/examples/feature-driven.md](~/.claude/skills/tdd-fundamentals/examples/feature-driven.md)

### `/fix` Usage

1. **Phase 1.5**: Manual regression test first
2. **Phase 3.5**: Generate additional tests (optional)
3. **Active**: Tests are immediately active

See: [@~/.claude/skills/tdd-fundamentals/examples/bug-driven.md](~/.claude/skills/tdd-fundamentals/examples/bug-driven.md)

## Best Practices

### Clear Context

```typescript
// ✅ Good - Specific context
prompt: `
Feature: User login
Requirements:
- FR-001: Email validation
- FR-002: Password strength check
Spec: ${specContent}
`

// ❌ Bad - Vague context
prompt: `Generate tests for login`
```

### Explicit Markers

```typescript
// ✅ Good - Clear skip marker
it.skip('validates email', () => {
  // TODO: [SKIP] FR-001
  expect(validateEmail('test@example.com')).toBe(true)
})

// ❌ Bad - No marker
it.skip('validates email', () => {
  expect(validateEmail('test@example.com')).toBe(true)
})
```

### Baby Steps Ordering

```typescript
// ✅ Good - Simple to complex
// Activation order: 1 → 2 → 3
it.skip('handles zero input', () => { })        // Simple
it.skip('calculates basic case', () => { })     // Basic
it.skip('handles complex scenarios', () => { }) // Complex

// ❌ Bad - Random order
it.skip('handles complex scenarios', () => { }) // Complex first!
it.skip('handles zero input', () => { })
```

## Common Issues

### Issue: Tests don't match framework

**Solution**: Always specify framework in prompt

```typescript
prompt: `
Framework: Jest
Style: AAA pattern (Arrange-Act-Assert)
`
```

### Issue: Tests too broad

**Solution**: Request focused, single-behavior tests

```typescript
prompt: `
Generate focused tests:
- One behavior per test
- Clear test names
- Single assertion when possible
`
```

### Issue: Missing edge cases

**Solution**: Explicitly request edge cases

```typescript
prompt: `
Include edge cases:
- Null/undefined inputs
- Empty arrays/strings
- Boundary values
- Error conditions
`
```

## References

- [@~/.claude/skills/tdd-fundamentals/SKILL.md](~/.claude/skills/tdd-fundamentals/SKILL.md) - TDD fundamentals
- [@./tdd-cycle.md](./tdd-cycle.md) - RGRC cycle details
