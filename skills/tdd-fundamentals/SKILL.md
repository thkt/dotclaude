---
name: tdd-fundamentals
description: >
  Test-Driven Development principles and RGRC cycle methodology.
  Core concepts for writing clean code that works through incremental
  development with fast feedback loops.
  Triggers: TDD, テスト駆動開発, Red-Green-Refactor, Baby Steps,
  clean code that works, RGRC cycle, test first, テストファースト,
  failing test, グリーンバー, レッドバー, refactoring, リファクタリング.
allowed-tools: Read, Grep, Glob
---

# TDD Fundamentals

Test-Driven Development principles and practices for building clean, working code.

## Purpose

Provide foundational TDD knowledge and patterns for feature development and bug fixing.

## Core Philosophy

**"Clean code that works"** - Ron Jeffries

Test-Driven Development is not just about testing—it's a design methodology that produces:

- **Working code**: Tests prove functionality
- **Clean code**: Refactoring step ensures quality
- **Confidence**: Small steps build compound success

## Baby Steps - The Foundation

**Core Principle**: Make the smallest possible change at each step

### Why Baby Steps Matter

1. **Immediate error localization**
   - When a test fails, the cause is in the last tiny change
   - No need to debug through hundreds of lines

2. **Continuous working state**
   - Code is always seconds away from green
   - Can commit at any time

3. **Rapid feedback**
   - Each step takes 1-2 minutes max
   - Quick validation loop

4. **Confidence building**
   - Small successes compound into major features
   - Reduces anxiety and overwhelm

### Baby Steps in Practice

```typescript
// ❌ Big Step - Multiple changes at once
function calculateTotal(items, tax, discount) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const afterTax = subtotal * (1 + tax);
  const afterDiscount = afterTax * (1 - discount);
  return afterDiscount;
}

// ✅ Baby Steps - One change at a time

// Step 1: Return zero (make test pass minimally)
function calculateTotal(items) {
  return 0;
}

// Step 2: Basic sum (next test drives this)
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Step 3: Add tax support (only when test requires it)
function calculateTotal(items, tax) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 + tax);
}

// ... continue in tiny increments
```

### Baby Steps Rhythm

A complete cycle should take approximately **2 minutes**:

1. **Write smallest failing test** (30 seconds)
2. **Make it pass with minimal code** (1 minute)
3. **Run tests** (10 seconds)
4. **Tiny refactor if needed** (30 seconds)
5. **Commit if green** (20 seconds)

**Total cycle**: ~2 minutes

## RGRC Cycle

The four phases of Test-Driven Development:

### 🔴 Red - Write Failing Test

**Goal**: Define what "done" looks like

- Write a test that fails
- Verify it fails for the RIGHT reason
- Test should be small and focused
- Clear assertion of expected behavior

**Exit criteria**: Test fails as expected

### 🟢 Green - Make it Pass

**Goal**: Get to working code as fast as possible

- Write the **minimum** code to pass the test
- Don't worry about elegance yet
- Quick and dirty is acceptable
- Focus on functionality, not form

**Exit criteria**: Test passes consistently

### 🔵 Refactor - Clean Up

**Goal**: Improve code quality without changing behavior

- Apply SOLID principles
- Remove duplication (DRY)
- Improve naming and structure
- Extract abstractions if needed

**Exit criteria**: All tests green, code clean

### ✅ Commit - Save Progress

**Goal**: Create stable checkpoint

- All tests passing
- Quality checks pass
- Coverage maintained/improved
- Ready for commit

**Exit criteria**: Confidence = 1.0

## test-generator Agent

The `test-generator` agent creates test scaffolding from specifications or bug descriptions.

### Basic Usage Pattern

```typescript
Task({
  subagent_type: "test-generator",
  description: "Generate tests from [source]",
  prompt: `
    Context: "${contextDescription}"
    Source: ${sourceContent}

    Generate:
    1. Test cases covering requirements
    2. Edge cases and error scenarios
    3. Integration tests if needed

    Framework: [Jest/Vitest/etc]
    Style: [AAA pattern/Given-When-Then]
  `
})
```

### Skip Mode (Feature Development)

For spec-driven development, generate all tests in skip state:

```typescript
Generate tests in SKIP MODE:
1. FR-xxx requirements → skipped test cases
2. Given-When-Then scenarios → skipped executable tests
3. Order tests: simple → complex (Baby Steps order)
4. Use framework-appropriate skip markers:
   - Jest/Vitest: it.skip() + // TODO: [SKIP] comment
   - Unknown: Comment out + // TODO: [SKIP] marker
```

### Active Mode (Bug Fixing)

For bug-driven development, generate active regression tests:

```typescript
Generate ACTIVE regression tests:
1. Test that reproduces the bug (should fail initially)
2. Edge cases related to the bug
3. Integration tests if bug spans components
```

## TDD Patterns

### Feature-Driven TDD

1. **Start with specification**
   - Read spec.md or requirements
   - Identify functional requirements (FR-xxx)

2. **Generate test scaffold**
   - Use test-generator in skip mode
   - All tests start skipped

3. **Activate one test at a time**
   - User confirms test activation
   - Red → Green → Refactor → Commit
   - Repeat for next test

**See**: [@./examples/feature-driven.md](./examples/feature-driven.md)

### Bug-Driven TDD

1. **Reproduce the bug**
   - Write failing test that demonstrates bug
   - Verify test fails for correct reason

2. **Fix the bug**
   - Implement minimal fix
   - Test passes

3. **Prevent regression**
   - Generate additional tests
   - Cover edge cases

**See**: [@./examples/bug-driven.md](./examples/bug-driven.md)

## Key Principles

### Occam's Razor in TDD

- Choose the simplest implementation that passes the test
- Don't add complexity until a test demands it
- Refactor only when tests are green

### YAGNI in TDD

- Implement only what current test requires
- Don't add features for imagined future needs
- Let tests drive design naturally

### Progressive Enhancement in TDD

- Start with the happy path
- Add error handling when tests require it
- Build complexity incrementally

## Common Pitfalls

### ❌ Writing Too Much Code

```typescript
// Don't implement everything at once
// Let tests drive each small increment
```

### ❌ Skipping Red Phase

```typescript
// Always verify test fails first
// Confirms test is actually testing something
```

### ❌ Not Refactoring

```typescript
// Refactor is essential
// Technical debt compounds quickly
```

### ❌ Large Test Steps

```typescript
// Keep tests small and focused
// One behavior per test
```

## Integration with Commands

- **`/code`**: Feature-driven TDD with spec.md
- **`/fix`**: Bug-driven TDD with regression tests
- **`/test`**: Test execution and verification

## References

### Principles (rules/)

- [@~/.claude/rules/development/TDD_RGRC.md](~/.claude/rules/development/TDD_RGRC.md) - Full TDD methodology
- [@~/.claude/rules/reference/OCCAMS_RAZOR.md](~/.claude/rules/reference/OCCAMS_RAZOR.md) - Simplest solution
- [@~/.claude/rules/reference/YAGNI.md](~/.claude/rules/reference/YAGNI.md) - Build only what's needed
- [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md) - Incremental complexity

### Implementation Details

- Commands reference `commands/shared/tdd-cycle.md` for RGRC implementation
- Commands reference `commands/shared/test-generation.md` for test-generator patterns

### Related Skills

- `generating-tdd-tests` - TDDテスト生成パターン
- `applying-code-principles` - リファクタリング原則

### Used by Commands

- `/code` - TDD実装サイクル
- `/fix` - バグ修正のリグレッションテスト
- `/test` - テスト実行・検証
