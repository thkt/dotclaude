---
name: test
description: Run project tests and validate code quality. Use when user mentions テスト実行, テスト走らせて, run tests, テストして.
allowed-tools: Bash(npm test), Bash(npm run), Bash(yarn test), Bash(yarn run), Bash(pnpm test), Bash(pnpm run), Bash(bun test), Bash(bun run), Bash(npx), Read, Glob, Grep, Task, AskUserQuestion
model: opus
argument-hint: "[test scope or specific tests]"
user-invocable: true
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

## Error Handling

| Error                | Action                                 |
| -------------------- | -------------------------------------- |
| No test runner found | Report "No test runner detected", stop |
| test-generator fails | Skip gap analysis, report test results |

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

## Escalation

| Condition           | Suggest                                          |
| ------------------- | ------------------------------------------------ |
| Tests failing       | `/fix` for targeted bug fix with regression test |
| Coverage gaps found | `/code` to implement missing tests via TDD       |
| Multiple failures   | `/research` to investigate root cause            |

## Verification

| Check                                               | Required |
| --------------------------------------------------- | -------- |
| `Task` called with `subagent_type: test-generator`? | Yes      |
