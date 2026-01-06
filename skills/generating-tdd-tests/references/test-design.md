---
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

### 1. Equivalence Partitioning

**Concept**: Divide inputs into groups (partitions) that should behave the same way.

**Why it works**: If one value in a partition works, all values should work (or fail) similarly.

```typescript
// Example: Age validation
function validateAge(age: number): boolean {
  return age >= 18 && age <= 120
}

// Equivalence partitions:
// 1. age < 18 (invalid - too young)
// 2. 18 <= age <= 120 (valid)
// 3. age > 120 (invalid - too old)

// Test cases - one from each partition:
test('rejects age 17', () => expect(validateAge(17)).toBe(false))  // Partition 1
test('accepts age 30', () => expect(validateAge(30)).toBe(true))   // Partition 2
test('rejects age 121', () => expect(validateAge(121)).toBe(false)) // Partition 3
```

### 2. Boundary Value Analysis

**Concept**: Test at the edges of partitions where bugs often hide.

**Why it works**: Off-by-one errors are common in boundary conditions.

```typescript
// For age validation, boundaries are: 18, 120

// Boundary test cases:
test('rejects age 17 (18-1)', () => expect(validateAge(17)).toBe(false))
test('accepts age 18 (min)', () => expect(validateAge(18)).toBe(true))
test('accepts age 120 (max)', () => expect(validateAge(120)).toBe(true))
test('rejects age 121 (120+1)', () => expect(validateAge(121)).toBe(false))

// Common pattern: test [min-1, min, max, max+1]
```

### 3. Decision Table Testing

**Concept**: For complex logic with multiple conditions, use tables to ensure all combinations are covered.

**Why it works**: Systematically covers all logical paths, preventing missed scenarios.

```typescript
// Example: User access control
// Conditions: isLoggedIn, isPremium, isActive
// Actions: allowAccess

/*
Decision Table:
| isLoggedIn | isPremium | isActive | allowAccess |
|------------|-----------|----------|-------------|
| false      | *         | *        | false       |
| true       | false     | false    | false       |
| true       | false     | true     | true        |
| true       | true      | false    | false       |
| true       | true      | true     | true        |

Note: * means "don't care" - value doesn't affect outcome
*/

// Test cases derived from table:
test('denies access when not logged in', () => {
  expect(canAccess(false, false, false)).toBe(false)
  expect(canAccess(false, true, true)).toBe(false)  // Premium doesn't matter
})

test('denies access when inactive', () => {
  expect(canAccess(true, false, false)).toBe(false)
  expect(canAccess(true, true, false)).toBe(false)
})

test('allows access for logged in, active free users', () => {
  expect(canAccess(true, false, true)).toBe(true)
})

test('allows access for logged in, active premium users', () => {
  expect(canAccess(true, true, true)).toBe(true)
})
```

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

### Occam's Razor Applied to Tests

```typescript
// Bad: Over-engineered
class AgeValidatorTestBuilder {
  withAge(age: number) { ... }
  withContext(ctx: any) { ... }
  build() { ... }
}

// Good: Simple and direct
test('validates age correctly', () => {
  expect(validateAge(30)).toBe(true)
})
```

### Readable Tests

Follow the same readability principles as production code:

- **Clear naming**: Test names describe what they verify
- **One focus**: Each test checks one specific behavior
- **Arrange-Act-Assert**: Clear structure
- **Minimal setup**: Only what's needed for the test

```typescript
// Good: Readable test
test('denies access to inactive users', () => {
  // Arrange
  const user = { isActive: false, isPremium: true }

  // Act
  const result = canAccess(user)

  // Assert
  expect(result).toBe(false)
})
```

### Miller's Law for Tests

Respect cognitive limits (7±2 items):

```typescript
// Bad: Too many test cases in one describe
describe('validation', () => {
  test('case 1', ...)
  test('case 2', ...)
  // ... 15 more tests
})

// Good: Grouped into categories
describe('validation', () => {
  describe('email validation', () => {
    // 3-5 tests
  })

  describe('password validation', () => {
    // 3-5 tests
  })

  describe('username validation', () => {
    // 3-5 tests
  })
})
```

## Framework-Agnostic Patterns

These techniques work with any testing framework:

### Jest / Vitest

```typescript
describe('unit', () => {
  test('behavior', () => {
    expect(actual).toBe(expected)
  })
})
```

### Mocha / Chai

```typescript
describe('unit', () => {
  it('should behavior', () => {
    expect(actual).to.equal(expected)
  })
})
```

### Pytest

```python
class TestUnit:
    def test_behavior(self):
        assert actual == expected
```

### RSpec

```ruby
describe 'unit' do
  it 'behavior' do
    expect(actual).to eq(expected)
  end
end
```

## Common Pitfalls

### 1. Random Testing

```typescript
// Bad: No systematic approach
test('it works', () => {
  expect(validateAge(25)).toBe(true)
  expect(validateAge(50)).toBe(true)
  expect(validateAge(75)).toBe(true)
  // Why these numbers? Missing boundaries!
})

// Good: Systematic design
test('accepts minimum valid age (boundary)', () => {
  expect(validateAge(18)).toBe(true)
})

test('accepts typical valid age (equivalence)', () => {
  expect(validateAge(30)).toBe(true)
})

test('accepts maximum valid age (boundary)', () => {
  expect(validateAge(120)).toBe(true)
})
```

### 2. Testing Implementation Instead of Behavior

```typescript
// Bad: Coupled to implementation
test('calls validateAge internally', () => {
  const spy = jest.spyOn(service, 'validateAge')
  service.registerUser({ age: 30 })
  expect(spy).toHaveBeenCalled()  // Brittle!
})

// Good: Test behavior
test('registers users with valid age', () => {
  const result = service.registerUser({ age: 30 })
  expect(result.success).toBe(true)
})
```

### 3. Incomplete Coverage

```typescript
// Bad: Missing boundary cases
test('validates age', () => {
  expect(validateAge(30)).toBe(true)  // Only happy path
})

// Good: Comprehensive coverage
test('rejects below minimum', () => expect(validateAge(17)).toBe(false))
test('accepts minimum', () => expect(validateAge(18)).toBe(true))
test('accepts valid age', () => expect(validateAge(30)).toBe(true))
test('accepts maximum', () => expect(validateAge(120)).toBe(true))
test('rejects above maximum', () => expect(validateAge(121)).toBe(false))
```

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

### Core Principles

- [@../../../skills/applying-code-principles/SKILL.md](~/.claude/skills/applying-code-principles/SKILL.md) - Keep tests simple and focused
- [@../../../skills/applying-code-principles/SKILL.md](~/.claude/skills/applying-code-principles/SKILL.md) - Limit test case complexity

### Development Practices

- [@./tdd-rgrc.md](./tdd-rgrc.md) - Test-first approach for implementation
- [@../../../rules/development/READABLE_CODE.md](~/.claude/rules/development/READABLE_CODE.md) - Clarity in test code
- [@../../../rules/development/PROGRESSIVE_ENHANCEMENT.md](~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md) - Start simple, enhance coverage gradually

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
