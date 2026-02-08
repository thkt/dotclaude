---
description: Implement code following TDD/RGRC cycle with real-time test feedback
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

1. `TeamCreate("code-{timestamp}")`
2. `TaskCreate` for test generation + RGRC phases
3. Spawn `test-gen` teammate (`subagent_type: test-generator`)
4. Receive test results from test-gen via DM
5. RGRC cycle with `ralph-loop` auto-iteration
6. `TaskUpdate` per phase completion
7. `SendMessage(shutdown_request)` to test-gen

## SOW Status Update

If SOW exists: update `draft` or `completed` → `in-progress`

## Todo Progress Tracking

Use `TaskList` + `TaskUpdate` to track RGRC phases (if todos exist from `/think`)
