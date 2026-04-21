---
name: challenge
description: Challenge proposals, designs, plans, or analyses with devil's advocate. Use when user mentions devils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し. Do NOT use for code review findings (use /audit) or outcome verification (use /verify which has built-in adversarial testing).
allowed-tools: Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[proposal file | description]"
user-invocable: true
---

# /challenge

Spawn `devils-advocate-design` against a proposal, analysis, or plan.

## Input

- `$1`: what to challenge (proposal file path or description)
- If `$1` is empty: stop and ask user to specify target. Silent target inference from conversation has high misfire risk.

## Execution

| Step | Action          | Detail                                                        |
| ---- | --------------- | ------------------------------------------------------------- |
| 1    | Identify target | Extract from `$1`                                             |
| 2    | Spawn DA        | Task(subagent_type: devils-advocate-design, background: true) |
| 3    | Report          | Agent output + actionable items                               |

### Step 2: Prompt

Include the target and any file paths the user referenced. Mention ARCHITECTURE.md or equivalent structural constraint files if they exist in the target project. The agent collects its own context via Read/Grep/Glob.

## Output

Present the agent's structured output verbatim, then append actionable items (top 3 concrete actions to keep, remove, or revise).
