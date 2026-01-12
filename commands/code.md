---
description: Implement code following TDD/RGRC cycle with real-time test feedback
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Bash(ls:*), Bash(cat:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[implementation description] [--frontend] [--principles] [--storybook]"
dependencies:
  [
    generating-tdd-tests,
    applying-frontend-patterns,
    applying-code-principles,
    integrating-storybook,
    orchestrating-workflows,
    ralph-loop,
  ]
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

## Execution

TDD implementation via RGRC cycle with `ralph-loop` auto-iteration.

## IDR

After implementation, generate IDR if SOW exists (skip if no SOW).
