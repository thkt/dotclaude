---
name: managing-testing
description: >
  Testing workflow patterns: E2E test generation, test orchestration.
  Triggers: testing, E2E, end-to-end, playwright, test runner, test orchestration.
allowed-tools: [Read, Write, Glob, Task, Bash]
user-invocable: false
---

# Managing Testing Workflows

Testing workflow patterns for automated test execution and E2E test generation.

## Workflow References

| Workflow    | Reference                       | Command |
| ----------- | ------------------------------- | ------- |
| E2E Testing | [@./references/e2e-workflow.md] | /e2e    |

**Note**: For automated test iteration, use `/ralph-loop` (official plugin).

## Test Discovery Priority

1. Read `README.md` → Scripts section
2. Check `package.json` → scripts
3. Search for test files (`*.test.*`, `*.spec.*`)
4. Ask user if not found

## Common Test Commands

| Package Manager | Command      |
| --------------- | ------------ |
| npm             | `npm test`   |
| yarn            | `yarn test`  |
| pnpm            | `pnpm test`  |
| vitest          | `npx vitest` |
| jest            | `npx jest`   |

## E2E Testing Flow

```text
1. Browser automation (claude-in-chrome)
2. Record user interactions
3. Generate Playwright test code
4. Document test scenarios
```

## Browser Tools for E2E

| Tool          | Purpose            |
| ------------- | ------------------ |
| `navigate`    | Go to URL          |
| `click`       | Click element      |
| `form_input`  | Fill form fields   |
| `read_page`   | Read page content  |
| `screenshot`  | Capture screenshot |
| `gif_creator` | Record interaction |
