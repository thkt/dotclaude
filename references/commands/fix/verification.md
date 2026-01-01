# Verification (Phase 3)

Run quality checks to ensure fix is solid and complete.

## Purpose

Verify the fix with parallel quality checks before considering the bug fixed.

## Quality Checks (Parallel Execution)

Run these checks simultaneously for fastest verification:

```bash
# Run all in parallel (if supported)
npm test -- --findRelatedTests &
npm run lint -- --fix &
npm run type-check &
wait
```

### Individual Commands

If parallel execution not available, run sequentially:

```bash
# 1. Test related files only (faster)
npm test -- --findRelatedTests src/utils/pricing.ts

# 2. Lint with auto-fix
npm run lint -- --fix

# 3. Type check
npm run type-check

# Or equivalents for your stack:
# - yarn test / pnpm test / bun test
# - eslint --fix / tsc --noEmit
```

## Verification Checklist

### 1. Tests Pass

- [x] Regression test passes (bug fixed)
- [x] All existing tests still pass (no regressions)
- [x] Related tests pass (affected areas)

**Command**:

```bash
# Run all tests
npm test

# Or run only affected tests (faster)
npm test -- --findRelatedTests [modified-files]
```

**Expected**:

```text
PASS src/utils/pricing.test.ts
  ✓ when discount exceeds total, should return 0 not negative
  ✓ calculates basic discount correctly
  ✓ handles zero discount

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

### 2. Lint Passes

- [x] No new lint errors
- [x] Auto-fixable issues resolved
- [WARN] Warnings acceptable if <5

**Command**:

```bash
npm run lint -- --fix
```

**Expected**:

```text
0 errors, 2 warnings
```

**Action if errors**:

- Fix all errors immediately
- Address warnings if time permits
- Never commit with lint errors

### 3. Type Check Passes

- [x] No type errors in modified files
- [x] No type errors in related files
- [x] TypeScript compilation succeeds

**Command**:

```bash
npm run type-check
# Or: tsc --noEmit
```

**Expected**:

```text
No type errors
```

### 4. No Regressions Detected

Verify the fix doesn't break:

- Related features
- Edge cases
- Integration points
- API contracts

**Manual spot check**:

```bash
# Start dev server and test manually
npm run dev

# Check:
# - Feature works as expected
# - Related features unaffected
# - No console errors
```

## Quality Gates Summary

| Check | Status | Action |
| --- | --- | --- |
| Tests | PASS All pass | Proceed |
| Tests | FAIL Some fail | Fix immediately |
| Lint | PASS 0 errors | Proceed |
| Lint | FAIL Errors | Fix all errors |
| Lint | WARN <5 warnings | Acceptable |
| Types | PASS No errors | Proceed |
| Types | FAIL Errors | Fix immediately |
| Manual | PASS Works | Proceed |
| Manual | FAIL Issues | Debug & fix |

## When Verification Fails

### Tests Fail

**Root cause investigation**:

1. Which tests fail?
   - Regression test → fix not correct
   - Other tests → introduced regression

2. Why do they fail?
   - Logic error → revisit implementation
   - Test assumption → update test or fix

**Action**:

- Return to Phase 2 (Implementation)
- Revise fix
- Re-run verification

### Lint Fails

**Action**:

```bash
# Auto-fix what's possible
npm run lint -- --fix

# Manually fix remaining issues
# Check lint output for specific errors
```

### Type Check Fails

**Action**:

```bash
# Check specific errors
npm run type-check

# Fix type errors
# Update types or implementation as needed
```

## Verification Output

```markdown
Verification Complete

Tests:
- Regression test: PASS
- All tests: PASS 18/18 passing
- Related tests: PASS 5/5 passing

Quality:
- Lint: PASS 0 errors, 2 warnings
- Types: PASS No errors
- Coverage: 78% (maintained)

Manual Check:
- Feature works: PASS
- No console errors: PASS
- Related features: PASS

Next: Test Generation (Phase 3.5) or Definition of Done
```

## Fast Track vs Thorough

### Fast Track (Confidence >0.9)

```bash
# Minimal checks
npm test -- --findRelatedTests [file]
npm run lint -- --fix [file]
```

### Thorough (Confidence <0.9)

```bash
# Full test suite
npm test

# Full lint
npm run lint -- --fix

# Type check
npm run type-check

# Manual testing
npm run dev
```

## Integration Points

- **Previous**: Phase 2 (Implementation)
- **Next**: Phase 3.5 (Test Generation) or Completion
- **If fails**: Return to Phase 2

## Related Principles

- [@~/.claude/references/commands/code/quality-gates.md](~/.claude/references/commands/code/quality-gates.md) - Detailed quality gates
- [@~/.claude/rules/core/AI_OPERATION_PRINCIPLES.md](~/.claude/rules/core/AI_OPERATION_PRINCIPLES.md) - Quality standards
