---
name: generating-tdd-tests
description: >
  Comprehensive TDD (Test-Driven Development) guide with RGRC cycle, Baby Steps methodology,
  and systematic test design techniques. Use when implementing TDD (テスト駆動開発),
  discussing Red-Green-Refactor, Baby Steps, test generation (テスト生成), test design
  (テスト設計), test cases (テストケース), equivalence partitioning, boundary value
  analysis (境界値分析), decision tables, coverage (カバレッジ), or unit testing
  (ユニットテスト). Provides t_wada-style Baby Steps approach with systematic test case
  generation and SOW integration. Essential for test-generator agent and /code TDD implementations.
allowed-tools: Read, Write, Edit, Grep, Glob, Task
---

# TDD Test Generation - Comprehensive Test-Driven Development Guide

## Overview

This skill provides systematic guidance for Test-Driven Development (TDD) combining:

1. **RGRC Cycle** - Red-Green-Refactor-Commit workflow inspired by t_wada
2. **Baby Steps** - Incremental development with 2-minute cycles
3. **Systematic Test Design** - Equivalence partitioning, boundary value analysis, decision tables
4. **Test Generation** - From SOW test plans to executable test cases

## When to Use This Skill

### Automatic Triggers

Keywords that activate this skill:

- TDD, Test-Driven Development, テスト駆動開発
- RGRC, Red-Green-Refactor, Baby Steps
- Test generation, test design, test cases
- Equivalence partitioning, boundary value, decision table
- Coverage, test first, unit test

### Explicit Invocation

For guaranteed activation:

- "Apply TDD skill"
- "Use TDD test generation skill"
- "Follow RGRC cycle"

### Common Scenarios

- Implementing features with `/code` command
- Generating tests with `test-generator` agent
- Planning test coverage strategies
- Refactoring with test safety nets
- Reviewing test design quality

## Core Concepts

### 1. Baby Steps - The Foundation

**"Make the smallest possible change at each step"** - t_wada

**Why it matters:**

- Immediate error localization (bug is in last 2-minute change)
- Continuous working state (always seconds from green)
- Rapid feedback loop
- Confidence through small successes

**2-Minute Cycle:**

1. Write smallest failing test (30s)
2. Make it pass minimally (1min)
3. Run tests (10s)
4. Tiny refactor (30s)
5. Commit if green (20s)

### 2. RGRC Cycle

**Goal**: "Clean code that works" (動作するきれいなコード) - Ron Jeffries

#### Red Phase

Write failing test → Verify correct failure reason

#### Green Phase

Minimal code to pass → "You can sin" (quick/dirty OK)

#### Refactor Phase

Apply SOLID/DRY → Improve structure → Keep tests green

#### Commit Phase

All checks pass → Save stable state

---

## 📋 TDD Workflow

Copy this checklist and track your progress:

```
TDD Cycle:
- [ ] Step 1: Red - 失敗するテスト作成
- [ ] Step 2: Green - 最小限のコードで通過
- [ ] Step 3: Refactor - コード改善
- [ ] Step 4: Commit - 変更をコミット
```

### Step 1: Red - 失敗するテスト作成

```typescript
// 1. テストファイルを作成/開く
// 2. AAA パターンでテストを書く
test('should validate email format', () => {
  // Arrange
  const email = 'invalid-email'

  // Act
  const result = validateEmail(email)

  // Assert
  expect(result).toBe(false)
})
```

- [ ] テストが意図通りに失敗することを確認
- [ ] 失敗理由が正しいことを確認

### Step 2: Green - 最小限のコードで通過

- [ ] テストを通過する最小限のコードを書く
- [ ] この段階では「汚くてもOK」
- [ ] テストが緑になることを確認

### Step 3: Refactor - コード改善

- [ ] コードの重複を除去
- [ ] 命名を改善
- [ ] 構造を整理
- [ ] **テストが緑のままであることを確認**

### Step 4: Commit - 変更をコミット

```bash
git add .
git commit -m "feat: add email validation"
```

- [ ] すべてのテストが通過
- [ ] リンターエラーがない
- [ ] 安定した状態を保存

---

### 3. Systematic Test Design

**Quality > Quantity** - Fewer well-designed tests catch more bugs

#### Equivalence Partitioning

Group inputs with same behavior, test one from each:

```typescript
// Age validation: <18 (invalid), 18-120 (valid), >120 (invalid)
test('partition 1: rejects 17', () => ...)
test('partition 2: accepts 30', () => ...)
test('partition 3: rejects 121', () => ...)
```

#### Boundary Value Analysis

Test edges [min-1, min, max, max+1]:

```typescript
test('boundary: rejects 17 (18-1)', () => ...)
test('boundary: accepts 18 (min)', () => ...)
test('boundary: accepts 120 (max)', () => ...)
test('boundary: rejects 121 (120+1)', () => ...)
```

#### Decision Table Testing

Complex logic with multiple conditions:

```typescript
// isLoggedIn × isPremium × isActive → canAccess
// Use decision table to cover all combinations systematically
```

## Detailed Knowledge Base

### Reference Documents

- **[@./references/tdd-rgrc.md]** - Complete RGRC cycle guide with t_wada's methodology
- **[@./references/test-design.md]** - Systematic test design techniques, coverage goals (C0: 80%, C1: 70%), framework-agnostic patterns

## Integration Points

### With Agents

- **test-generator** - Generates tests from SOW using this skill's principles
- **testability-reviewer** - Evaluates test design quality

### With Commands

- **/code** - Applies TDD during implementation
- **/test** - Validates coverage and quality

### Integration Method

```yaml
# In agent YAML frontmatter
dependencies: [tdd-test-generation]
```

Or explicit reference:

```markdown
[@~/.claude/skills/generating-tdd-tests/SKILL.md]
```

## Quick Start

### New Feature

1. **Red** - Write failing test
2. **Green** - Minimal code
3. **Refactor** - Clean up
4. **Commit** - Save
5. **Repeat**

### From SOW

1. Read SOW test plan
2. Apply equivalence partitioning
3. Add boundary values
4. Generate test cases
5. Verify coverage

### Refactoring

1. Ensure comprehensive tests
2. Verify green
3. Refactor incrementally
4. Run frequently
5. Commit when green

## Best Practices

### Do's ✅

- Write test before code
- Keep steps small (Baby Steps)
- Run tests frequently
- Commit when green
- Use systematic test design
- Apply SOLID/DRY in Refactor, not before

### Don'ts ❌

- Skip Red phase
- Write multiple tests before any pass
- Refactor without green tests
- Commit with failing tests
- Random test selection
- Complex architecture in Green phase

## Coverage Goals

Industry-recommended targets:

- **C0 (Statement)**: 80% minimum
- **C1 (Branch)**: 70% minimum

Why: Cost-benefit balance, focus on critical paths

## When NOT to Use TDD

Skip for:

- Prototypes (throwaway code)
- External API integration (use mocks)
- Simple one-off scripts
- UI experiments (visual iteration first)

## Success Metrics

TDD is working when:

- Tests written before code (100%)
- Cycles complete in <5 min
- Refactoring feels safe
- Coverage meets targets
- Velocity increases over time

## Resources

### references/

Comprehensive documentation loaded as needed:

- `tdd-rgrc.md` - Detailed RGRC cycle implementation
- `test-design.md` - Complete test design techniques guide

### Related Testing Resources

For command output testing and document quality standards:

- **[~/.claude/tests/README.md](../../tests/README.md)** - Command test strategy and verification checklists
- **[~/.claude/golden-masters/](../../golden-masters/)** - Document quality standards (SOW/Spec examples, output formats)
- **[~/.claude/tests/scenarios/](../../tests/scenarios/)** - Test scenarios for command validation

### scripts/

Test automation utilities:

- `run-tests.sh` - Auto-detect package manager and test runner
- `coverage-check.sh` - Verify coverage thresholds (default: 100%)
- `generate-test.sh` - Generate test scaffolds with AAA pattern

### assets/

Configuration file templates (TDD-optimized with 100% coverage targets):

- `vitest.config.ts` - Vitest configuration template
- `jest.config.js` - Jest configuration template
