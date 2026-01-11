# Test Generation Patterns

Patterns for test-generator agent usage across commands.

## Patterns Overview

| Pattern         | Use Case                      | Test State  |
| --------------- | ----------------------------- | ----------- |
| Spec-Driven     | Feature development (`/code`) | Skip mode   |
| Bug-Driven      | Bug fixing (`/fix`)           | Active mode |
| Coverage-Driven | Improve coverage              | Active mode |

## Pattern 1: Spec-Driven (Feature Development)

**Use Case**: Generating tests from spec.md for `/code` command.

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
4. Use framework-appropriate skip markers
  `,
});
```

**Characteristics**:

- All tests start in skip state
- User activates one-by-one
- Baby Steps order (simple → complex)

## Pattern 2: Bug-Driven (Bug Fixing)

**Use Case**: Generating regression tests for `/fix` command.

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
  `,
});
```

**Characteristics**:

- Tests active immediately (not skipped)
- Focuses on regression prevention
- Edge cases around the fix

## Pattern 3: Coverage-Driven

**Use Case**: Adding tests to improve coverage.

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
  `,
});
```

## Framework Skip Markers

| Framework   | Skip Syntax                                             |
| ----------- | ------------------------------------------------------- |
| Jest/Vitest | `it.skip('test', () => { // TODO: [SKIP] FR-001 })`     |
| Mocha       | `it.skip('test', function() { })` or `xit('test', ...)` |
| Unknown     | Comment out with `// TODO: [SKIP]` marker               |

## Test Design Techniques

| Technique                | Use For                    | Example                         |
| ------------------------ | -------------------------- | ------------------------------- |
| Equivalence Partitioning | Group same-behavior inputs | Age: <18, 18-120, >120          |
| Boundary Value           | Test edges                 | 17, 18, 120, 121                |
| Decision Table           | Complex multi-condition    | isLoggedIn × isPremium → access |

## AAA Pattern

```typescript
test("descriptive name", () => {
  // Arrange - Setup
  // Act - Execute
  // Assert - Verify
});
```

## Naming Convention

```typescript
describe("[TargetClass/FunctionName]", () => {
  describe("[MethodName/Scenario]", () => {
    it("when [condition], should [expected result]", () => {
      // AAA
    });
  });
});
```

## Best Practices

| Practice | Good                          | Bad                 |
| -------- | ----------------------------- | ------------------- |
| Context  | Specific requirements         | "Generate tests"    |
| Markers  | Clear skip marker with FR-xxx | No marker           |
| Order    | Simple → Complex (Baby Steps) | Random order        |
| Focus    | One behavior per test         | Multiple assertions |

## Coverage Goals

| Level          | Target | Focus              |
| -------------- | ------ | ------------------ |
| C0 (Statement) | 80%    | All lines executed |
| C1 (Branch)    | 70%    | All branches taken |

## Test Priority Matrix

### [Priority 1] Must Test

- Business Logic: Calculations, validation, state transitions
- Service/Repository Layer: Data operations
- Critical Paths: Billing, authentication, data persistence
- Edge Cases: Boundary values, null/undefined

### [Priority 2] Situational

- Complex utility functions
- Custom hooks (state management portion)
- Complex transformations

### [Skip] No Testing Needed

- Simple property accessors
- UI layout/styling
- External library behavior
- Simple CRUD (framework-provided)
