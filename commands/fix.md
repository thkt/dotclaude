---
description: Rapidly fix small bugs and minor improvements in development environment. Use when user mentions バグ修正, 直して, 修正して, fix bug, 不具合.
allowed-tools: Bash(git diff:*), Bash(git ls-files:*), Bash(npm test:*), Bash(npm run), Bash(npm run:*), Bash(yarn run:*), Bash(pnpm run:*), Bash(bun run:*), Edit, MultiEdit, Read, Grep, Glob, LS, Task, AskUserQuestion
model: opus
argument-hint: "[bug or issue description]"
---

# /fix - Quick Bug Fix

NO FIX WITHOUT REPRODUCTION TEST.

Write a test that reproduces the bug before fixing it. The test must fail before the fix and pass after.

Rapidly fix small bugs with root cause analysis and TDD verification.

## Input

- Bug or issue description: `$1`
- OR: Suggestion ID from `/audit` output (e.g., `/fix SUG-001`)
- If `$1` is empty → select fix type via AskUserQuestion
- Scope: small, well-understood issues (1-3 files)

### Fix Prompt

| Question    | Options                                |
| ----------- | -------------------------------------- |
| Fix type    | Bug fix / Error message / Test failure |
| Description | [free text via Other]                  |

### Suggestion ID Mode (`/fix SUG-XXX`)

| Step | Action                                                       |
| ---- | ------------------------------------------------------------ |
| 1    | Read latest snapshot from `$HOME/.claude/workspace/history/` |
| 2    | Find matching suggestion by ID                               |
| 3    | Apply fix directly (skip 5 Whys)                             |
| 4    | Verify tests pass                                            |

## Skills & Agents

| Type  | Name                  | Purpose                         |
| ----- | --------------------- | ------------------------------- |
| Skill | analyzing-root-causes | 5 Whys methodology              |
| Agent | test-generator        | Regression test creation (fork) |
| Agent | build-error-resolver  | TypeScript/build error fix      |

## Execution

### Build Check

Run project build command (detect from package.json or project config).

| Result       | Action                                            |
| ------------ | ------------------------------------------------- |
| Build errors | `Task` with `subagent_type: build-error-resolver` |
| No errors    | Continue to Step 1                                |

### Standard Flow (No Build Errors)

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

## Error Handling

| Error                      | Action                                 |
| -------------------------- | -------------------------------------- |
| build-error-resolver fails | Present error, ask user for guidance   |
| test-generator timeout     | Skip regression test, proceed with fix |
| Tests still fail after fix | Re-analyze root cause or escalate      |

## Verification

| Check                  | Required |
| ---------------------- | -------- |
| Root cause identified? | Yes      |
| All tests pass?        | Yes      |
