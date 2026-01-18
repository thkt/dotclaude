---
description: Rapidly fix small bugs and minor improvements in development environment
allowed-tools: Bash(git diff:*), Bash(git ls-files:*), Bash(npm test:*), Bash(npm run), Bash(npm run:*), Bash(yarn run:*), Bash(pnpm run:*), Bash(bun run:*), Bash(ls:*), Edit, MultiEdit, Read, Grep, Glob, Task
model: opus
argument-hint: "[bug or issue description]"
---

# /fix - Quick Bug Fix

Rapidly fix small bugs with root cause analysis and TDD verification.

## Input

- Argument: bug or issue description (required)
- OR: Suggestion ID from `/audit` output (e.g., `SUG-001`)
- If missing: prompt via AskUserQuestion
- Scope: small, well-understood issues (1-3 files)

### Suggestion ID Mode (`/fix SUG-XXX`)

| Step | Action                                                       |
| ---- | ------------------------------------------------------------ |
| 1    | Read latest snapshot from `$HOME/.claude/workspace/history/` |
| 2    | Find matching suggestion by ID                               |
| 3    | Apply fix directly (skip 5 Whys)                             |
| 4    | Verify tests pass                                            |

## Skills & Agents

| Type  | Name                    | Purpose                         |
| ----- | ----------------------- | ------------------------------- |
| Skill | analyzing-root-causes   | 5 Whys methodology              |
| Agent | test-generator          | Regression test creation (fork) |
| Skill | orchestrating-workflows | Fix workflow definition         |

## Execution

| Step | Action                                                   |
| ---- | -------------------------------------------------------- |
| 1    | Root cause analysis (5 Whys)                             |
| 2    | `Task` with `subagent_type: test-generator` for reg test |
| 3    | Fix implementation                                       |
| 4    | Verify all tests pass                                    |

## Escalation

| Confidence | Action                 |
| ---------- | ---------------------- |
| [?] <70%   | Escalate → `/research` |
| Complex    | Multi-file → `/code`   |
| New scope  | Feature → `/think`     |

## Verification

| Check                                               | Required |
| --------------------------------------------------- | -------- |
| `Task` called with `subagent_type: test-generator`? | Yes      |
