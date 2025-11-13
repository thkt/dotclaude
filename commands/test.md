---
description: >
  Run project tests and validate code quality through comprehensive testing. Automatically discovers test commands from package.json, README, or project configuration.
  Handles unit, integration, and E2E tests with progress tracking via TodoWrite. Includes browser testing for UI changes when applicable.
  Use after implementation to verify functionality and quality standards.
  プロジェクトのテストを実行し、包括的なテストでコード品質を検証。ユニット、統合、E2Eテストに対応。
allowed-tools: Bash(npm test), Bash(npm run), Bash(yarn test), Bash(yarn run), Bash(pnpm test), Bash(pnpm run), Bash(bun test), Bash(bun run), Bash(npx), Read, Glob, Grep, TodoWrite
model: inherit
argument-hint: "[test scope or specific tests]"
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

### 3. Quality Checks

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
5. Execute quality checks
6. Summarize results
```

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
