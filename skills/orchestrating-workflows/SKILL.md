---
name: orchestrating-workflows
description: >
  Workflow orchestration for /code, /fix, /audit, and other commands.
  Triggers: workflow, ワークフロー, RGRC, quality gates, 品質ゲート, completion criteria.
allowed-tools: [Read, Write, Grep, Glob, Task, Bash(npm:*, npx:*, tsc:*, bun:*)]
user-invocable: false
---

# Orchestrating Workflows

## Workflows

| Command | Workflow Reference                                              |
| ------- | --------------------------------------------------------------- |
| `/code` | [@./references/code-workflow.md](./references/code-workflow.md) |
| `/fix`  | [@./references/fix-workflow.md](./references/fix-workflow.md)   |

## Patterns

| Pattern         | Reference                                                                    |
| --------------- | ---------------------------------------------------------------------------- |
| IDR Generation  | [hooks/lifecycle/idr-pre-commit.sh](../../hooks/lifecycle/idr-pre-commit.sh) |
| TDD Cycle       | [@./references/tdd-cycle.md](./references/tdd-cycle.md)                      |
| Test Generation | [@./references/test-generation.md](./references/test-generation.md)          |

## Quality Gates

| Gate     | Target           | Verification               |
| -------- | ---------------- | -------------------------- |
| Tests    | All passing      | `npm test` exit code 0     |
| Lint     | 0 errors         | `npm run lint` exit code 0 |
| Types    | No errors        | `tsc --noEmit` exit code 0 |
| Coverage | C0 ≥90%, C1 ≥80% | Coverage report            |
