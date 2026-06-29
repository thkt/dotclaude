---
name: outcome
description: Generates and updates .claude/OUTCOME.md interactively. When the file is absent or empty (no Behavior / all sections TBD), collects content via AskUserQuestion and writes the stub; when present, shows the current state and applies updates.
when_to_use: OUTCOME作って, OUTCOME更新, アウトカム定義, create outcome, update outcome
allowed-tools: Read Write Edit AskUserQuestion
model: opus
---

# /outcome - OUTCOME.md generation and update

Generate or update `.claude/OUTCOME.md` interactively. This skill is also the landing point when another skill detects a missing OUTCOME.md. Interactive generation instead of hard-stop keeps new-repo bootstrap moving. Not proceeding on a mere warning prevents work from continuing against a vague outcome.

## Branch

| State                                            | Flow     |
| ------------------------------------------------ | -------- |
| File absent, Behavior empty, or all sections TBD | Generate |
| Otherwise                                        | Update   |

## Generate

1. Read `${CLAUDE_SKILL_DIR}/templates/outcome.md` (structure)
2. Collect Behavior (≥1, subject named), Non-goals, Constraints in one AskUserQuestion call, one question per item (3 Qs)
3. Run each Behavior through the Outcome test; rewrite failures and re-present to the user
4. Fill the template and Write `.claude/OUTCOME.md`

## Update

1. Read `.claude/OUTCOME.md` and present the current three sections
2. Confirm which sections change and their content via AskUserQuestion
3. Run each changed Behavior through the Outcome test, then Edit

## Done condition

Write or Edit only after every Behavior satisfies all four Outcome test checks.
