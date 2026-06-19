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

`$ARGUMENTS` holds the bug description or a finding ID from `/audit` snapshot (e.g., `RC-001`, `SEC-003`). Scope is limited to small, well-understood issues of 1-3 files. The `$ARGUMENTS` pattern routes the mode.

| Pattern             | Mode                  | Action                                                                                                                                                                                                                                                        |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/^[A-Z]+-[0-9]+$/` | Finding ID Resolution | Read the latest snapshot from `${CLAUDE_SKILL_DIR}/../../workspace/history/` and find the ID match in findings[]. Carry severity / fix_type / root cause, skip Outcome Anchor and Build Check, enter Triage. If absent, present error + suggest Standard Flow |
| empty               | Fix Prompt            | Ask via AskUserQuestion for Fix type (Bug fix / Error message / Test failure) and Description (free text via Other), then execute                                                                                                                             |
| otherwise           | Standard Flow         | Treat as a bug description and run from Outcome Anchor                                                                                                                                                                                                        |

## Delegation Map

| Type      | Target                                               | Purpose                                           |
| --------- | ---------------------------------------------------- | ------------------------------------------------- |
| Skill     | `use-context-root-cause-analysis`                    | 5 Whys for non-obvious bugs                       |
| Agent     | `generator-test`                                     | Regression test from symptom + repro steps        |
| Agent     | `resolver-build`                                     | TypeScript or build error triage                  |
| Reference | `${CLAUDE_SKILL_DIR}/references/defense-in-depth.md` | Multi-layer validation for Recurring / Systematic |

## Outcome Anchor

Read `.claude/OUTCOME.md` before Build Check. If absent, generate the stub via /outcome. Confirm the bug or fix lives inside the outcome state. If outside, § Escalation.

## Build Check

Detect the build command from package.json or project config and run it.

| Result       | Action                                                |
| ------------ | ----------------------------------------------------- |
| Build errors | `Task` with `subagent_type: resolver-build`, then END |
| No errors    | Continue to Triage                                    |

## Triage

Obvious skips both RCA and regression test generation, so it is limited to findings with low misfix risk.

| Input      | Condition                                                      | Path        |
| ---------- | -------------------------------------------------------------- | ----------- |
| Bug desc   | Single location identified + 1-3 line fix + no similar pattern | Obvious     |
| Bug desc   | Intermittent, multiple repro conditions, or unknown root cause | Non-obvious |
| Finding ID | `fix_type: auto` and severity low / med                        | Obvious     |
| Finding ID | Otherwise (critical / high, or not auto)                       | Non-obvious |

## Obvious

1. Apply minimal fix
2. Run tests covering affected code if any exist

## Non-obvious

1. Run 5 Whys via `Skill("use-context-root-cause-analysis")`. If via Finding ID, pass the snapshot root cause as the 5 Whys starting point. Output Symptom / Root cause / Pattern.
2. `Task(subagent_type: generator-test)` for regression test (pass symptom + repro only)
3. Verify regression test is Red
4. Apply fix
5. Verify regression test is Green and no other tests regressed
6. If Pattern is Recurring or Systematic, apply `${CLAUDE_SKILL_DIR}/references/defense-in-depth.md`

## Escalation

Branch on objective triggers, not confidence self-assessment. Do not attempt fix #4 without escalating.

| Trigger                        | Action                                                           |
| ------------------------------ | ---------------------------------------------------------------- |
| RCA cannot identify root cause | Escalate to `/research`                                          |
| Tests still fail after fix     | Re-analyze root cause. After 3 failures, escalate to `/research` |
| Multi-file impact (4+ files)   | Delegate to `/code`                                              |
| New feature scope              | Delegate to `/think`                                             |
| Pattern = Systematic           | Escalate to `/research`                                          |
| Fix outside OUTCOME.md scope   | Confirm with user; redefine Non-goals or delegate to `/code`     |

## Error Handling

| Error                  | Action                                 |
| ---------------------- | -------------------------------------- |
| resolver-build fails   | Present error, ask user for guidance   |
| generator-test timeout | Skip regression test, proceed with fix |

## Verification

| Check                                    | Required                          |
| ---------------------------------------- | --------------------------------- |
| Root cause identified (Non-obvious path) | Yes                               |
| All tests pass                           | Yes                               |
| Pattern field recorded from RCA          | Yes (Non-obvious path)            |
| defense-in-depth applied if needed       | Yes (Recurring / Systematic only) |
| Re-audit suggested if via Finding ID     | Yes (Finding ID path)             |
