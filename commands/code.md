---
description: Implement code following TDD/RGRC cycle with real-time test feedback
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Bash(ls:*), Bash(cat:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task, TaskList, TaskUpdate
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

### ralph-loop Fallback

Without plugin: manual iteration (user confirms each RGRC step)

## Execution

| Step | Action                                                |
| ---- | ----------------------------------------------------- |
| 1    | `Task` with `subagent_type: test-generator` for tests |
| 2    | RGRC cycle with `ralph-loop` auto-iteration           |
| 3    | Tests run in fork context (preserves main context)    |

## SOW Status Update

If SOW exists, update Status to `in-progress` at start.

| Current Status | Action                               |
| -------------- | ------------------------------------ |
| draft          | Update → `in-progress`               |
| in-progress    | Skip (no change needed)              |
| completed      | Update → `in-progress` (resume work) |
| SOW not found  | Skip (no action needed)              |

## Todo Progress Tracking

| Timing     | Action                                 |
| ---------- | -------------------------------------- |
| Start      | `TaskList` → match phase → in_progress |
| Phase done | `TaskUpdate` → completed               |
| Next phase | `TaskUpdate` → next → in_progress      |
| No todos   | Skip (no `/think` ran)                 |

## Verification

| Check                                              | Required |
| -------------------------------------------------- | -------- |
| `Task` called with `subagent_type: test-generator` | Yes      |
