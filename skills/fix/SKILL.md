---
name: fix
description: Rapidly fix small bugs and minor improvements in development environment. Do NOT use for new feature implementation or large-scale changes (use /code instead).
when_to_use: バグ修正, 直して, 修正して, fix bug, 不具合
allowed-tools: Bash(git diff:*) Bash(git ls-files:*) Bash(npm test:*) Bash(npm run) Bash(npm run:*) Bash(yarn run:*) Bash(pnpm run:*) Bash(bun run:*) Edit MultiEdit Read LS Task AskUserQuestion Skill Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[bug or issue description]"
---

# /fix - Quick Bug Fix

Rapidly fix small bugs with root cause analysis and TDD verification.

## Input

- `$ARGUMENTS`: bug description OR Suggestion ID from `/audit` (e.g., `SUG-001`)
- Scope: small, well-understood issues (1-3 files)

### Routing

| `$ARGUMENTS` pattern | Mode                         |
| -------------------- | ---------------------------- |
| `/^SUG-[0-9]+$/`     | Suggestion ID Mode           |
| empty                | Fix Prompt (AskUserQuestion) |
| otherwise            | Standard Flow                |

### Fix Prompt

Asked via AskUserQuestion when `$ARGUMENTS` is empty.

| Question    | Options                                |
| ----------- | -------------------------------------- |
| Fix type    | Bug fix / Error message / Test failure |
| Description | [free text via Other]                  |

### Suggestion ID Mode

| Step | Action                                                                 |
| ---- | ---------------------------------------------------------------------- |
| 1    | Read latest snapshot from ${CLAUDE_SKILL_DIR}/../../workspace/history/ |
| 2    | Find matching suggestion by ID                                         |
| 3    | Apply fix directly (skip RCA, trust audit finding)                     |
| 4    | Verify tests pass                                                      |
| 5    | Suggest targeted re-audit: `/audit <modified files>`                   |

## Delegation Map

| Type      | Target                          | Purpose                                         |
| --------- | ------------------------------- | ----------------------------------------------- |
| Skill     | use-context-root-cause-analysis | 5 Whys for non-obvious bugs                     |
| Agent     | generator-test                  | Regression test from symptom + repro steps      |
| Agent     | resolver-build                  | TypeScript or build error triage                |
| Reference | references/defense-in-depth.md  | Multi-layer validation for Recurring/Systematic |

## Execution

### Outcome Anchor

Read `.claude/OUTCOME.md` before Build Check. If absent, generate the stub via /outcome. Confirm the bug or fix lives inside the outcome state. Escalate if outside (see Escalation).

### Build Check

Run project build command (detect from package.json or project config).

| Result       | Action                                                |
| ------------ | ----------------------------------------------------- |
| Build errors | `Task` with `subagent_type: resolver-build`, then END |
| No errors    | Continue to Triage                                    |

### Triage

| Condition                                                      | Path                       |
| -------------------------------------------------------------- | -------------------------- |
| Single location identified + 1-3 line fix + no similar pattern | Obvious: Direct Fix        |
| Intermittent, multiple repro conditions, or unknown root cause | Non-obvious: Full Protocol |

### Obvious: Direct Fix

| Step | Action                                          |
| ---- | ----------------------------------------------- |
| 1    | Apply minimal fix                               |
| 2    | Run tests covering affected code (skip if none) |

### Non-obvious: Full Protocol

| Step | Action                                                                                         |
| ---- | ---------------------------------------------------------------------------------------------- |
| 1    | `Skill("use-context-root-cause-analysis")` for 5 Whys. Output: Symptom / Root cause / Pattern  |
| 2    | `Task(subagent_type: generator-test)` for regression test (pass symptom + repro only)          |
| 3    | Verify regression test is Red                                                                  |
| 4    | Apply fix                                                                                      |
| 5    | Verify regression test is Green and no other tests regressed                                   |
| 6    | If Pattern ∈ {Recurring, Systematic}: apply ${CLAUDE_SKILL_DIR}/references/defense-in-depth.md |

## Escalation

Objective triggers. No confidence self-assessment.

| Trigger                        | Action                                                       |
| ------------------------------ | ------------------------------------------------------------ |
| RCA cannot identify root cause | Escalate → `/research`                                       |
| 3 fix attempts failed          | STOP. Escalate → `/research` with full context               |
| Multi-file impact (>3 files)   | Delegate → `/code`                                           |
| New feature scope              | Delegate → `/think`                                          |
| Pattern = Systematic           | Escalate → `/research`                                       |
| Fix outside OUTCOME.md scope   | Confirm with user; redefine Non-goals or delegate to `/code` |

The ≥3 rule: if three distinct fix attempts fail, the issue is likely architectural, not a local bug. Do not attempt fix #4 without escalating.

## Error Handling

| Error                      | Action                                 |
| -------------------------- | -------------------------------------- |
| resolver-build fails       | Present error, ask user for guidance   |
| generator-test timeout     | Skip regression test, proceed with fix |
| Tests still fail after fix | Re-analyze root cause or escalate      |

## Verification

| Check                                    | Required                        |
| ---------------------------------------- | ------------------------------- |
| Root cause identified (Non-obvious path) | Yes                             |
| All tests pass                           | Yes                             |
| Pattern field recorded from RCA          | Yes (Non-obvious path)          |
| defense-in-depth applied if needed       | Yes (Recurring/Systematic only) |
