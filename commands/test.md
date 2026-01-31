---
description: Run project tests and validate code quality through comprehensive testing
allowed-tools: Bash(npm test), Bash(npm run), Bash(yarn test), Bash(yarn run), Bash(pnpm test), Bash(pnpm run), Bash(bun test), Bash(bun run), Bash(npx), Read, Glob, Grep, Task, AskUserQuestion
model: opus
argument-hint: "[test scope or specific tests]"
---

# /test - Test Execution & Quality Validation

Run project tests with gap analysis and quality checks.

## Input

- Test scope or file pattern: `$1` (optional)
- If `$1` is empty → select scope via AskUserQuestion

### Scope Selection

| Question | Options                        |
| -------- | ------------------------------ |
| Scope    | all / unit / integration / e2e |

## Agent

| Type  | Name           | Purpose             |
| ----- | -------------- | ------------------- |
| Agent | test-generator | Gap analysis (fork) |

## Execution

| Step | Action                                               |
| ---- | ---------------------------------------------------- |
| 1    | Run tests (npm/yarn/pnpm/bun)                        |
| 2    | Coverage analysis                                    |
| 3    | `Task` with `subagent_type: test-generator` for gaps |
| 4    | Quality checks (lint, type-check)                    |

## Flow: Execute

```text
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

## Verification

| Check                                               | Required |
| --------------------------------------------------- | -------- |
| `Task` called with `subagent_type: test-generator`? | Yes      |
