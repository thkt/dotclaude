# TDD Cycle Implementation Details

Detailed implementation guidance for Red-Green-Refactor-Commit cycle.

## Purpose

Provides concrete steps and exit criteria for each phase of the RGRC cycle.

## Prerequisites

Basic understanding of TDD principles:
[@~/.claude/skills/tdd-fundamentals/SKILL.md](~/.claude/skills/tdd-fundamentals/SKILL.md)

## Enhanced RGRC Cycle with Real-time Feedback

### 1. 🔴 Red Phase

**Confidence Target**: 0.9

```bash
# Run specific test
npm test -- --testNamePattern="[current test]" | grep -E "FAIL|PASS"
```

**Steps**:

1. Write failing test with clear intent (or use generated tests)
2. Verify failure reason matches expectation
3. Document understanding via test assertions
4. Ensure test is actually testing something

**Exit Criteria**:

- ✅ Test fails for expected reason
- ✅ Failure message is clear
- ✅ Test is focused on one behavior

**Common Mistakes**:

- ❌ Test passes immediately (not testing anything)
- ❌ Failure reason is unclear
- ❌ Test is too broad

### 2. 🟢 Green Phase

**Confidence Target**: 0.7

```bash
# Watch mode for rapid feedback
npm test -- --watch --testNamePattern="[current test]"
```

**Steps**:

1. Write **minimal** implementation to pass
2. Quick solutions acceptable (don't optimize yet)
3. Focus on functionality over form
4. Hardcoding is OK if it passes the test

**Exit Criteria**:

- ✅ Test passes consistently
- ✅ No other tests broken
- ✅ Implementation is minimal

**Common Mistakes**:

- ❌ Over-implementing (adding untested features)
- ❌ Premature optimization
- ❌ Breaking existing tests

**Example**:

```typescript
// ✅ Good Green Phase - Minimal
function add(a, b) {
  return a + b; // Just enough to pass
}

// ❌ Bad Green Phase - Over-implementation
function add(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Invalid input'); // Not tested yet!
  }
  return parseFloat((a + b).toFixed(2)); // Over-engineered!
}
```

### 3. 🔵 Refactor Phase

**Confidence Target**: 0.95

```bash
# Verify all tests still pass
npm test | tail -5 | grep -E "Passing|Failing"
```

**Steps**:

1. Apply SOLID principles
2. Remove duplication (DRY)
3. Improve naming and structure
4. Extract abstractions if pattern emerges (3+ times)

**Exit Criteria**:

- ✅ All tests green
- ✅ Code is clean and readable
- ✅ No duplication
- ✅ Names are clear

**Common Mistakes**:

- ❌ Changing behavior (should only improve structure)
- ❌ Breaking tests during refactor
- ❌ Premature abstraction (before 3rd use)

**Refactoring Checklist**:

- [ ] Variable/function names are descriptive
- [ ] Functions are small (<20 lines)
- [ ] No duplication (DRY applied)
- [ ] Single Responsibility (each function does one thing)
- [ ] All tests still passing

### 4. ✅ Commit Phase

**Confidence Target**: 1.0

**Pre-commit Checks**:

```bash
# Run all checks in parallel
npm run lint && npm test && npm run type-check
```

**Steps**:

1. Verify all quality checks pass
2. Confirm coverage maintained/improved
3. Review changes one final time
4. Create meaningful commit message

**Exit Criteria**:

- ✅ All tests passing
- ✅ Lint passes (0 errors)
- ✅ Type check passes
- ✅ Coverage ≥ previous
- ✅ Changes reviewed

**Commit Message Format**:

```bash
# Good commit messages
feat: add user validation
fix: prevent negative discount
refactor: extract email validation

# Bad commit messages
wip
stuff
update
```

## Cycle Timing Guidelines

| Phase | Target Time | Max Time |
|-------|-------------|----------|
| Red | 30-60 sec | 2 min |
| Green | 1-2 min | 5 min |
| Refactor | 30-90 sec | 3 min |
| Commit | 20-30 sec | 1 min |
| **Total** | **~2 min** | **10 min** |

**If exceeding max time**:

- Red: Test is too complex, break it down
- Green: Implementation too ambitious, simplify
- Refactor: Save for later, commit as-is
- Commit: Skip optional checks, commit now

## Progress Indicators

### Visual Progress

```markdown
📋 TDD Cycle Progress

🔴 Red Phase    [████████████] Complete ✓
🟢 Green Phase  [████████░░░░] 70% ⏳
🔵 Refactor     [░░░░░░░░░░░░] Waiting
✅ Commit       [░░░░░░░░░░░░] Waiting

Current: Writing minimal implementation...
Elapsed: 3 min | Confidence: 0.7
```

### Confidence Scoring

Each phase has a target confidence level:

- **0.9** (Red): High confidence test captures requirement
- **0.7** (Green): Medium confidence implementation works
- **0.95** (Refactor): Very high confidence code is clean
- **1.0** (Commit): Absolute confidence ready to commit

Lower confidence → revisit previous phase

## Integration Points

### With Feature Development (`/code`)

- Phase 0: Generate skipped tests from spec.md
- Phase 1-4: RGRC cycle for each test
- Interactive: User confirms each test activation

### With Bug Fixing (`/fix`)

- Phase 1.5: Write regression test (Red)
- Phase 2: Implement fix (Green)
- Phase 3: Clean up (Refactor)
- Phase 3.5: Generate additional tests

## Tips for Success

### Keep Tests Small

```typescript
// ✅ Small, focused test
it('returns 0 for empty array', () => {
  expect(sum([])).toBe(0)
})

// ❌ Large, multi-behavior test
it('handles all edge cases', () => {
  expect(sum([])).toBe(0)
  expect(sum([1])).toBe(1)
  expect(sum([1, 2, 3])).toBe(6)
  expect(() => sum(null)).toThrow()
})
```

### Resist Temptation

- Don't add "just one more feature" in Green
- Don't skip Refactor "just this once"
- Don't commit without running tests

### Trust the Process

TDD feels slow at first, but:

- Debugging time → near zero
- Refactoring confidence → maximum
- Code quality → consistently high

## References

- [@~/.claude/skills/tdd-fundamentals/SKILL.md](~/.claude/skills/tdd-fundamentals/SKILL.md) - TDD principles
- [@~/.claude/rules/development/TDD_RGRC.md](~/.claude/rules/development/TDD_RGRC.md) - Full methodology
