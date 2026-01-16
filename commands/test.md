---
description: Run project tests and validate code quality through comprehensive testing
allowed-tools: Bash(npm test), Bash(npm run), Bash(yarn test), Bash(yarn run), Bash(pnpm test), Bash(pnpm run), Bash(bun test), Bash(bun run), Bash(npx), Read, Glob, Grep, TodoWrite, Task
model: opus
argument-hint: "[test scope or specific tests]"
---

# /test - Test Execution & Quality Validation

Run project tests with gap analysis and quality checks.

## Input

- No argument: run all tests
- Argument: specific test scope or file pattern

## Execution

1. Run tests (npm/yarn/pnpm/bun)
2. Coverage analysis
3. Gap analysis via `test-generator` (uncovered paths)
4. Quality checks (lint, type-check)

## Flow: Execute

```
[Execute] → [Result]
```

## Display Format

### Result

```markdown
## 🧪 Test Results

| Metric   | Value |
| -------- | ----- |
| Total    | XX    |
| Passed   | XX    |
| Failed   | XX    |
| Coverage | XX%   |
| Time     | X.Xs  |

### Gaps Identified

[if any]
```

### Success

**Tests**: ✅ XX passed | ❌ XX failed | Coverage XX%
