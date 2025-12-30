---
paths: "**/*.test.*, **/tests/**, **/__tests__/**"
summary: |
  Systematic test design using equivalence partitioning, boundary value analysis,
  and decision tables. Framework-agnostic principles for high-quality test generation.
  Quality over quantity - design tests that catch real bugs efficiently.
decision_question: "Are test cases covering all meaningful scenarios efficiently?"
---

# Test Generation - Systematic Test Design

**Core principle**: Design tests systematically using proven techniques, not ad-hoc guessing.

## Philosophy

**Quality over quantity**: Well-designed tests catch more bugs with fewer test cases.

### Key Principles

1. **Systematic Coverage** - Use formal techniques to ensure completeness
2. **Efficiency** - Cover all scenarios with minimum tests
3. **Maintainability** - Tests should be easy to understand and update
4. **Framework Agnostic** - Principles apply regardless of testing framework

## Test Design Techniques

| Technique | Concept | Pattern | Example |
| --- | --- | --- | --- |
| **Equivalence Partitioning** | Divide inputs into groups that behave similarly | Test one value from each partition | Age validation: <18 (invalid), 18-120 (valid), >120 (invalid) → Test 17, 30, 121 |
| **Boundary Value Analysis** | Test at partition edges where bugs hide | Test [min-1, min, max, max+1] | Age boundaries 18, 120 → Test 17, 18, 120, 121 |
| **Decision Tables** | Map all condition combinations for complex logic (3+ conditions) | Create truth table, derive tests | Access control: isLoggedIn × isPremium × isActive → 5 meaningful combinations to test |

## Coverage Goals

### Recommended Targets

Based on industry best practices and cost-benefit analysis:

- **C0 (Statement Coverage)**: 80% minimum
- **C1 (Branch Coverage)**: 70% minimum

### Why These Numbers?

- **80/70 rule**: Covers most critical paths without diminishing returns
- **Cost vs Benefit**: Beyond 90%, effort increases exponentially for marginal gains
- **Focus on critical paths**: 100% coverage doesn't guarantee bug-free code

### Measuring Coverage

```bash
# Most frameworks support coverage reporting
npm test -- --coverage          # Jest, Vitest
yarn test --coverage            # With yarn
pytest --cov=src tests/         # Python
```

### Coverage Analysis

```markdown
Priority coverage areas:
1. **Critical business logic** - payment, authentication, data integrity
2. **Public APIs** - all exposed interfaces
3. **Error handlers** - exception paths
4. **Complex conditionals** - decision points

Lower priority:
- Getters/setters without logic
- Framework-generated code
- Simple data structures
- Configuration files
```

## Test Design Workflow

### Step 1: Identify Test Units

Break down to testable units (typically public methods):

```typescript
// Good: Good: Test one method at a time
describe('UserService.validateAge', () => {
  // Tests for validateAge
})

// Bad: Avoid: Testing entire class at once
describe('UserService', () => {
  // Mixing tests for multiple methods
})
```

### Step 2: Design Test Scenarios

For each unit:

1. **List equivalence partitions**
2. **Identify boundary values**
3. **Create decision table if complex logic**
4. **Derive test cases systematically**

### Step 3: Write Test Cases

```typescript
// Clear test structure - one assertion focus per test
describe('validateAge', () => {
  // Equivalence partitions
  describe('invalid ages', () => {
    test('rejects negative age', () => {
      expect(validateAge(-1)).toBe(false)
    })

    test('rejects age above maximum', () => {
      expect(validateAge(150)).toBe(false)
    })
  })

  // Boundary values
  describe('boundary conditions', () => {
    test('accepts minimum valid age', () => {
      expect(validateAge(18)).toBe(true)
    })

    test('rejects one below minimum', () => {
      expect(validateAge(17)).toBe(false)
    })
  })

  // Valid partition
  describe('valid ages', () => {
    test('accepts typical adult age', () => {
      expect(validateAge(30)).toBe(true)
    })
  })
})
```

## Integration with Other Principles

| Principle | Apply to Tests | Key Pattern |
| --- | --- | --- |
| **Occam's Razor** | Avoid test builders, helpers for simple cases | Direct test > complex test infrastructure |
| **Readable Code** | Clear naming, one focus per test, Arrange-Act-Assert structure, minimal setup | Test names describe what they verify |
| **Miller's Law** | Group tests into categories (7±2 limit) | `describe('validation', () => { describe('email', ...), describe('password', ...) })` |

## Framework-Agnostic Patterns

| Framework | Structure | Assertion |
| --- | --- | --- |
| **Jest/Vitest** | `describe('unit', () => { test('behavior', () => {...}) })` | `expect(actual).toBe(expected)` |
| **Mocha/Chai** | `describe('unit', () => { it('should behavior', () => {...}) })` | `expect(actual).to.equal(expected)` |
| **Pytest** | `class TestUnit: def test_behavior(self): ...` | `assert actual == expected` |
| **RSpec** | `describe 'unit' do it 'behavior' do ... end end` | `expect(actual).to eq(expected)` |

## Common Pitfalls

| Pitfall | Problem | Solution |
| --- | --- | --- |
| **Random Testing** | Testing arbitrary values (25, 50, 75) without rationale - misses boundaries | Use systematic design: test boundaries (min-1, min, max, max+1) + one equivalence value |
| **Testing Implementation** | Spying on internal method calls - brittle, couples to implementation | Test behavior: verify outcomes, not how they're achieved |
| **Incomplete Coverage** | Only testing happy path - missing edge cases | Cover all partitions + boundaries: [min-1, min, valid, max, max+1] |

## Quick Reference

### Test Design Checklist

For each public method/function:

- [ ] Identify equivalence partitions
- [ ] Test one value from each partition
- [ ] Identify boundary values
- [ ] Test [min-1, min, max, max+1] for each boundary
- [ ] Create decision table for complex logic (3+ conditions)
- [ ] Verify C0 coverage ≥ 80%
- [ ] Verify C1 coverage ≥ 70%
- [ ] Tests are readable and maintainable

### When to Use Each Technique

| Technique | When to Use | Example |
| --- | --- | --- |
| Equivalence Partitioning | Input ranges, categories | Age validation, user roles |
| Boundary Value Analysis | Numeric ranges, limits | Min/max values, array bounds |
| Decision Tables | Multiple conditions (3+) | Access control, state machines |

## Related Principles

See: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md#development-practices)

## Remember

> "The goal of testing is not to achieve 100% coverage, but to catch bugs efficiently with well-designed tests."

**Key takeaways**:

- **Systematic > Random**: Use formal techniques, not guesswork
- **Quality > Quantity**: Few well-designed tests beat many random tests
- **Boundaries matter**: Most bugs hide at the edges
- **Keep it simple**: Tests should be easier to understand than production code

**Decision framework**:

Before writing tests, ask:

1. What are the equivalence partitions?
2. What are the boundary values?
3. Is the logic complex enough for a decision table?
4. Are my tests covering all meaningful scenarios?
5. Can I simplify these tests while maintaining coverage?
