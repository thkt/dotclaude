---
description: Implement code following TDD/RGRC cycle with real-time test feedback. Use when user mentions 実装して, コード書いて, implement, coding.
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task, TaskCreate, TaskList, TaskUpdate, TeamCreate, SendMessage, AskUserQuestion
model: opus
argument-hint: "[implementation description] [--frontend] [--principles] [--storybook]"
---

# /code - TDD Implementation

NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

Violation → delete the code, write the test, then rewrite.

## Announce at Start

Before writing any code, declare:

> Starting TDD RGRC cycle. Every code change begins with a failing test.

## Rationalization Counters

| Excuse                           | Counter                                                                |
| -------------------------------- | ---------------------------------------------------------------------- |
| "This is too simple for TDD"     | Simple changes hide regressions. One test line prevents hours of debug |
| "I'll add tests later"           | "Later" never comes. Test debt compounds with interest                 |
| "This is just a refactor"        | Refactors without tests are the #1 cause of silent regressions         |
| "Existing tests already cover"   | If they do, Red phase will confirm it. Run it                          |
| "Testing this would be too slow" | A slow test is faster than a production bug                            |

## Input

Implementation description: `$1` (required, prompt if empty)
Flags: `--frontend`, `--principles`, `--storybook`

| Flag           | Loads                      |
| -------------- | -------------------------- |
| `--frontend`   | applying-frontend-patterns |
| `--principles` | applying-code-principles   |
| `--storybook`  | integrating-storybook      |

## SOW Context

[@../skills/lib/sow-resolution.md]

## Skills & Agents

- Agent: test-generator (TDD test generation, fork)
- Skill: orchestrating-workflows (RGRC cycle)
- Plugin: ralph-loop (auto-iteration, manual fallback if unavailable)

## Team Structure

```text
/code (LEADER)
└── test-gen (test-generator, TDD test generation)
```

## Execution

1. **SOW Context**: detect and read SOW/spec
2. `TeamCreate("code-{timestamp}")`
3. `TaskCreate` for test generation + RGRC phases
4. Spawn `test-gen` teammate (`subagent_type: test-generator`)
5. Receive test results from test-gen via DM
6. RGRC cycle with `ralph-loop` auto-iteration
7. `TaskUpdate` per phase completion
8. `SendMessage(shutdown_request)` to test-gen

## Error Handling

| Error                     | Action                          |
| ------------------------- | ------------------------------- |
| test-gen DM timeout       | Leader generates tests directly |
| test-gen produces 0 tests | Verify spec exists, ask user    |
| Ralph-loop stalls         | Stop loop, fix manually         |
| Quality gates fail        | Fix issues before commit        |
