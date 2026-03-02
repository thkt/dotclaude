---
description:
  Implement code following TDD/RGRC cycle with real-time test feedback. Use when
  user mentions 実装して, コード書いて, implement, coding.
allowed-tools:
  Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*),
  Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run),
  Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git
  log:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task, AskUserQuestion
model: opus
argument-hint:
  "[implementation description] [--frontend] [--principles] [--storybook]"
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

Implementation description: `$1` (required, prompt if empty) Flags:
`--frontend`, `--principles`, `--storybook`

| Flag           | Loads                      |
| -------------- | -------------------------- |
| `--frontend`   | applying-frontend-patterns |
| `--principles` | applying-code-principles   |
| `--storybook`  | integrating-storybook      |

## SOW Context

[@../skills/lib/sow-resolution.md]

## Skills & Agents

- Agent: test-generator (TDD test generation, standalone background)
- Skill: orchestrating-workflows (RGRC cycle)
- Plugin: ralph-loop (auto-iteration, manual fallback if unavailable)

## Execution

1. **SOW Context**: detect and read SOW/spec
2. Spawn `test-gen` as standalone background agent
   (`subagent_type: test-generator`, `run_in_background: true`)
3. Receive test results via `TaskOutput`
4. RGRC cycle with `ralph-loop` auto-iteration
5. Quality Gates

## Error Handling

| Error                       | Action                          |
| --------------------------- | ------------------------------- |
| test-gen background timeout | Leader generates tests directly |
| test-gen produces 0 tests   | Verify spec exists, ask user    |
| Ralph-loop stalls           | Stop loop, fix manually         |
| Quality gates fail          | Fix issues before commit        |
