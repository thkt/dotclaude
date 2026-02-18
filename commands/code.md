---
description: Implement code following TDD/RGRC cycle with real-time test feedback. Use when user mentions 実装して, コード書いて, implement, coding.
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Bash(ls:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task, TaskCreate, TaskList, TaskUpdate, TeamCreate, SendMessage, AskUserQuestion
model: opus
argument-hint: "[implementation description] [--frontend] [--principles] [--storybook]"
---

# /code - TDD Implementation

Implement code with TDD/RGRC cycle and quality checks.

## Input

Implementation description: `$1` (required, prompt if empty)
Flags: `--frontend`, `--principles`, `--storybook`

| Flag           | Loads                      |
| -------------- | -------------------------- |
| `--frontend`   | applying-frontend-patterns |
| `--principles` | applying-code-principles   |
| `--storybook`  | integrating-storybook      |

## SOW Context (auto)

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

1. **SOW Context**: detect and read SOW/spec (see above)
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

## Todo Progress Tracking

Use `TaskList` + `TaskUpdate` to track RGRC phases (if todos exist from `/think`)
