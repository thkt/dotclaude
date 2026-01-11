---
description: Run project tests and validate code quality through comprehensive testing
allowed-tools: Bash(npm test), Bash(npm run), Bash(yarn test), Bash(yarn run), Bash(pnpm test), Bash(pnpm run), Bash(bun test), Bash(bun run), Bash(npx), Read, Glob, Grep, TodoWrite, Task
model: inherit
argument-hint: "[test scope or specific tests]"
dependencies: [test-generator, managing-testing]
---

# /test - Test Execution & Quality Validation

Run project tests with gap analysis and quality checks.

## Process

```text
1. Run Tests
   └─ npm/yarn/pnpm/bun test

2. Coverage Analysis
   └─ npm test -- --coverage

3. Gap Analysis (test-generator)
   └─ Identify uncovered paths

4. Quality Checks
   └─ lint, type-check, format
```

## Test Commands

| Package Manager | Command     |
| --------------- | ----------- |
| npm             | `npm test`  |
| yarn            | `yarn test` |
| pnpm            | `pnpm test` |
| bun             | `bun test`  |

## Gap Analysis

Uses test-generator agent:

```typescript
Task({
  subagent_type: "test-generator",
  description: "Analyze test coverage gaps",
  prompt: `...analyze uncovered paths...`,
});
```

### Output

```markdown
## Test Coverage Gaps

### High Priority (< 50% coverage)

- **File**: src/utils/validation.ts
  - **Lines**: 45-67
  - **Suggested Test**: [code snippet]

### Estimated Impact

- Current: 65% → Target: 85%
```

## Quality Checks

```bash
npm run lint
npm run type-check
npx tsc --noEmit
```

## Result Summary

- Total tests / Passed / Failed
- Coverage percentage
- Execution time

## Next Steps

- **Failed** → `/fix`
- **Low coverage** → Add tests
- **All green** → `/commit`
