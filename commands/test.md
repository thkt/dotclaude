---
description: >
  Run project tests and validate code quality through comprehensive testing. Automatically discovers test commands from package.json, README, or project configuration.
  Handles unit, integration, and E2E tests with progress tracking via TodoWrite. Includes browser testing for UI changes when applicable.
  Use after implementation to verify functionality and quality standards.
  プロジェクトのテストを実行し、包括的なテストでコード品質を検証。ユニット、統合、E2Eテストに対応。
allowed-tools: Bash(npm test), Bash(npm run), Bash(yarn test), Bash(yarn run), Bash(pnpm test), Bash(pnpm run), Bash(bun test), Bash(bun run), Bash(npx), Read, Glob, Grep, TodoWrite, Task
model: inherit
argument-hint: "[test scope or specific tests]"
dependencies: [test-generator]
---

# /test - Test Execution & Quality Validation

## Purpose

Run project tests and ensure code quality through comprehensive testing and validation.

## Initial Discovery

### Check Package Manager

```bash
!`ls package*.json 2>/dev/null | head -1`
```

## Test Execution Process

### 1. Run Tests

Use TodoWrite to track testing progress.

First, check available scripts in package.json:

```bash
cat package.json
```

Then run appropriate test command:

```bash
npm test
```

Alternative package managers:

```bash
yarn test
```

```bash
pnpm test
```

```bash
bun test
```

### 2. Coverage Analysis

Run tests with coverage:

```bash
npm test -- --coverage
```

Check coverage directory:

```bash
ls coverage/
```

### 3. Test Gap Analysis

**Purpose**: Automatically identify missing tests and suggest improvements based on coverage data.

Use test-generator agent to analyze coverage gaps:

```typescript
Task({
  subagent_type: "test-generator",
  description: "Analyze test coverage gaps",
  prompt: `
Test Results: ${testResults}
Coverage: ${coverageData}

Analyze gaps:
1. Uncovered code: files <80%, untested functions, branches [✓]
2. Missing scenarios: edge cases, error paths, boundaries [→]
3. Quality issues: shallow tests, missing assertions [→]
4. Generate test code for priority areas [→]

Return: Test code snippets (not descriptions), coverage improvement estimate.
Mark: [✓] verified gaps, [→] suggested tests.
  `
})
```

#### Gap Analysis Output

```markdown
## Test Coverage Gaps

### High Priority (< 50% coverage)
- **File**: src/utils/validation.ts
  - **Lines**: 45-67 (23 lines uncovered)
  - **Issue**: No tests for error cases
  - **Suggested Test**:
    ```typescript
    describe('validation', () => {
      it('should handle invalid input', () => {
        expect(() => validate(null)).toThrow('Invalid input')
      })
    })
    ```

### Medium Priority (50-80% coverage)
- **File**: src/services/api.ts
  - **Lines**: 120-135
  - **Issue**: Network error handling not tested

### Edge Cases Not Covered
1. Boundary conditions (empty arrays, null values)
2. Concurrent operations
3. Timeout scenarios

### Estimated Impact
- Adding suggested tests: 65% → 85% coverage
- Effort: ~2 hours
- Critical paths covered: 95%+
```

### 4. Quality Checks

#### Linting

```bash
npm run lint
```

#### Type Checking

```bash
npm run type-check
```

Alternative:

```bash
npx tsc --noEmit
```

#### Format Check

```bash
npm run format:check
```

## Result Analysis

### Test Results Summary

Provide clear summary of:

- Total tests run
- Passed/Failed breakdown
- Execution time
- Coverage percentage (if measured)

### Failure Analysis

For failed tests:

1. Identify test file and line number
2. Analyze failure reason
3. Suggest specific fix
4. Link to relevant code

### Coverage Report

When coverage is available:

- Line coverage percentage
- Branch coverage percentage
- Uncovered critical paths
- Suggestions for improvement

## TodoWrite Integration

Automatic task tracking:

```markdown
1. Discover test infrastructure
2. Run test suite
3. Analyze failures (if any)
4. Generate coverage report
5. Analyze test gaps (NEW - test-generator)
6. Execute quality checks
7. Summarize results
```

**Enhanced with test-generator**: Step 5 now includes automated gap analysis and test suggestions.

## Best Practices

1. **Fix Immediately**: Don't accumulate test debt
2. **Monitor Coverage**: Track trends over time
3. **Prioritize Failures**: Fix broken tests before adding new ones
4. **Document Issues**: Keep failure patterns for future reference

## Next Steps

Based on results:

- **Failed Tests** → Use `/fix` to address specific failures
- **Low Coverage** → Add tests for uncovered critical paths
- **All Green** → Ready for commit/PR
- **Quality Issues** → Fix lint/type errors first
