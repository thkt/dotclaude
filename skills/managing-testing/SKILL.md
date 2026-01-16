---
name: managing-testing
description: >
  Testing workflow patterns: E2E test generation, test orchestration.
  Triggers: testing, E2E, end-to-end, playwright, test runner, test orchestration.
allowed-tools: [Read, Write, Glob, Task, Bash]
user-invocable: false
---

# Managing Testing Workflows

## Workflows

| Workflow    | Reference                       | Command |
| ----------- | ------------------------------- | ------- |
| E2E Testing | [@./references/e2e-workflow.md] | /e2e    |

## Test Discovery Priority

1. Read `README.md` → Scripts section
2. Check `package.json` → scripts
3. Search for test files (`*.test.*`, `*.spec.*`)
4. Ask user if not found

## Common Commands

| Manager | Command      |
| ------- | ------------ |
| npm     | `npm test`   |
| yarn    | `yarn test`  |
| pnpm    | `pnpm test`  |
| vitest  | `npx vitest` |
| jest    | `npx jest`   |
