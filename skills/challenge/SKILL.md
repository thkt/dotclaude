---
name: challenge
description: Challenge proposals, designs, plans, or analyses with devil's advocate. Do NOT use for code review findings (use /audit) or outcome assertion (use /assert which has built-in adversarial testing).
when_to_use: devils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し
allowed-tools: Read Glob Grep LS Task
model: opus
argument-hint: "[proposal file | description]"
---

# /challenge

Spawn `critic-design` against a proposal, analysis, or plan.

## Input

- `$ARGUMENTS`: what to challenge (proposal file path or description)
- If `$ARGUMENTS` is empty: stop and ask user to specify target. Silent target inference from conversation has high misfire risk.

## Execution

| Step | Action          | Detail                                                                                                                                                                      |
| ---- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Identify target | Extract from `$ARGUMENTS`                                                                                                                                                   |
| 2    | Spawn DA        | Task(subagent_type: critic-design, background: true). Pass target + referenced file paths. Mention ARCHITECTURE.md or equivalent if present. Agent collects its own context |
| 3    | Report          | Agent output + actionable items                                                                                                                                             |

## Output

Present the agent's structured output verbatim, then append actionable items (top 3 concrete actions to keep, remove, or revise).
