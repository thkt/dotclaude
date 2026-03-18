---
name: challenge
description: Challenge proposals, designs, plans, or analyses with devil's advocate. Use
  when user mentions devils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し.
  Do NOT use for code review findings (use /audit which has built-in challenger).
allowed-tools: Read, Glob, Grep, LS, Task, AskUserQuestion
model: opus
argument-hint: "[what to challenge]"
user-invocable: true
---

# /challenge

Spawn `devils-advocate-design` against a proposal, analysis, or plan.

## Input

- `$1`: what to challenge (description, or file path)
- If `$1` is empty: challenge the most recent proposal/analysis in this
  conversation

## Execution

| Step | Action          | Detail                                                        |
| ---- | --------------- | ------------------------------------------------------------- |
| 1    | Identify target | Extract from `$1` or conversation context                     |
| 2    | Spawn DA        | Task(subagent_type: devils-advocate-design, background: true) |
| 3    | Report          | Verdict table + summary metrics + actionable items            |

### Step 2: Prompt

Include the target and any file paths the user referenced. The agent collects
its own context via Read/Grep/Glob.

## Output

Present DA results with:

1. Verdict table (per-item)
2. Summary metrics (confirmed/weakened/needs_revision)
3. Actionable items: what to keep, remove, or revise
