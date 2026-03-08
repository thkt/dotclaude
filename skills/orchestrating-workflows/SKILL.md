---
name: orchestrating-workflows
description: >
  Workflow orchestration for /code, /fix, /audit, and other commands. Use when
  executing workflow commands, or when user mentions /code ワークフロー, /fix
  ワークフロー, quality gates, 品質ゲート, RGRC サイクル, completion criteria.
allowed-tools: [Read, Write, Grep, Glob, Task, Bash(npm:*, npx:*, tsc:*, bun:*)]
user-invocable: false
---

# Orchestrating Workflows

## Workflows

| Command | Workflow Reference                                |
| ------- | ------------------------------------------------- |
| `/code` | `${CLAUDE_SKILL_DIR}/references/code-workflow.md` |
| `/fix`  | `${CLAUDE_SKILL_DIR}/references/fix-workflow.md`  |

## Patterns

| Pattern         | Reference                                                                    |
| --------------- | ---------------------------------------------------------------------------- |
| IDR Generation  | [hooks/lifecycle/idr-pre-commit.sh](../../hooks/lifecycle/idr-pre-commit.sh) |
| TDD Cycle       | `${CLAUDE_SKILL_DIR}/references/tdd-cycle.md`                                |
| Test Generation | `${CLAUDE_SKILL_DIR}/references/test-generation.md`                          |

## Quality Gates

ALL 4 GATES MUST PASS. NO GATE IS OPTIONAL.

| Gate     | Target           | Verification               |
| -------- | ---------------- | -------------------------- |
| Tests    | All passing      | `npm test` exit code 0     |
| Lint     | 0 errors         | `npm run lint` exit code 0 |
| Types    | No errors        | `tsc --noEmit` exit code 0 |
| Coverage | C0 ≥90%, C1 ≥80% | Coverage report            |

## Rationalization Counters

| Excuse                                   | Counter                                                        |
| ---------------------------------------- | -------------------------------------------------------------- |
| "Tests pass, lint can wait"              | Lint errors are tech debt. Zero errors before commit           |
| "Type errors are just warnings"          | `tsc --noEmit` exit 0 or no ship. Type warnings are errors     |
| "Coverage is close enough"               | "Close enough" is failure with extra steps. Meet the threshold |
| "This gate doesn't apply to this change" | All 4 gates apply to every change. No exceptions               |
