---
description: Rapidly fix small bugs and minor improvements in development environment
allowed-tools: Bash(git diff:*), Bash(git ls-files:*), Bash(npm test:*), Bash(npm run), Bash(npm run:*), Bash(yarn run:*), Bash(pnpm run:*), Bash(bun run:*), Bash(ls:*), Edit, MultiEdit, Read, Grep, Glob, Task
model: opus
argument-hint: "[bug or issue description]"
dependencies: [Explore, generating-tdd-tests, orchestrating-workflows]
---

# /fix - Quick Bug Fix

Rapidly fix small bugs with root cause analysis and TDD verification.

## Input

- Argument: bug or issue description (required)
- If missing: prompt via AskUserQuestion
- Scope: small, well-understood issues (1-3 files)

## Execution

Root cause analysis (5 Whys) → Regression test first → Fix → Verify.

Workflow details in `orchestrating-workflows`.

## Escalation

| Confidence | Action                 |
| ---------- | ---------------------- |
| [?] <70%   | Escalate → `/research` |
| Complex    | Multi-file → `/code`   |
| New scope  | Feature → `/think`     |

## IDR

`/fix` does NOT generate IDR - use `/code` for features needing decision tracking.
