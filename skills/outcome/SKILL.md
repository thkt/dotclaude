---
name: outcome
description: Generates and updates .claude/OUTCOME.md interactively. When the file is absent or empty (no Behavior / all sections TBD), collects content via AskUserQuestion and writes the stub; when present, shows the current state and applies updates.
when_to_use: OUTCOME作って, OUTCOME更新, アウトカム定義, create outcome, update outcome
allowed-tools: Read Write Edit AskUserQuestion
model: opus
---

# /outcome - OUTCOME.md generation and update

The landing point when another skill detects a missing OUTCOME.md. Neither hard-stop nor warn-and-pass; generate interactively.

## Branch

| State                                            | Flow     |
| ------------------------------------------------ | -------- |
| File absent, Behavior empty, or all sections TBD | Generate |
| Otherwise                                        | Update   |

## Generate

1. Read `${CLAUDE_SKILL_DIR}/templates/outcome.md`
2. Collect Behavior, Non-goals, Constraints in one AskUserQuestion call, one question per item. Behavior needs 1 or more entries with the subject named
3. Run each Behavior through the Outcome test; rewrite failures and re-present to the user
4. Fill the template and Write `.claude/OUTCOME.md`

## Update

1. Read `.claude/OUTCOME.md` and present the current three sections
2. Confirm which sections change and their content via AskUserQuestion
3. Run each changed Behavior through the Outcome test, then Edit
