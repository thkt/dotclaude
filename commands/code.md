---
description: Implement code following TDD/RGRC cycle with real-time test feedback
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Bash(ls:*), Bash(cat:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[implementation description] [--frontend] [--principles] [--storybook]"
---

# /code - TDD Implementation

Implement code with TDD/RGRC cycle and quality checks.

## Input

- Argument: implementation description (required)
- If missing: prompt via AskUserQuestion
- Flags: `--frontend`, `--principles`, `--storybook` (optional)

## Conditional Context

| Flag           | Loads                      | Use Case    |
| -------------- | -------------------------- | ----------- |
| `--frontend`   | applying-frontend-patterns | React/UI    |
| `--principles` | applying-code-principles   | Refactoring |
| `--storybook`  | integrating-storybook      | Stories     |

## Skills & Agents

| Type   | Name                    | Purpose                    |
| ------ | ----------------------- | -------------------------- |
| Agent  | test-generator          | TDD test generation (fork) |
| Skill  | orchestrating-workflows | RGRC cycle definition      |
| Plugin | ralph-loop              | Auto-iteration (external)  |

## Execution

| Step | Action                                                |
| ---- | ----------------------------------------------------- |
| 1    | `Task` with `subagent_type: test-generator` for tests |
| 2    | RGRC cycle with `ralph-loop` auto-iteration           |
| 3    | Tests run in fork context (preserves main context)    |

## IDR

After implementation, generate IDR if SOW exists (skip if no SOW).

## Verification

| Check                                               | Required |
| --------------------------------------------------- | -------- |
| `Task` called with `subagent_type: test-generator`? | Yes      |
