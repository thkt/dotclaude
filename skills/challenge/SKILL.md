---
name: challenge
description: Two-phase challenge to a proposal/design/plan/analysis. Phase 1 grills the user with one-question-at-a-time interviews to surface assumptions and trade-offs. Phase 2 spawns critic-design with the surfaced material as devil's advocate input. Do NOT use for code review findings (use /audit) or outcome assertion (use /assert which has built-in adversarial testing).
when_to_use: devils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し, 質問攻め, 詰めて, grill me, 壁打ち
allowed-tools: Read LS Task Bash(ugrep:*) Bash(bfs:*) AskUserQuestion
model: opus
argument-hint: "[proposal file | description]"
---

# /challenge

Two-phase challenge. Phase 1 grills, Phase 2 spawns critic-design.

## Input

- `$ARGUMENTS`: what to challenge (proposal file path or description)
- If `$ARGUMENTS` is empty: stop and ask user to specify target. Silent target inference from conversation has high misfire risk.

## Phase 1 Grill

Ask one question at a time. Each question must include a recommended answer presented as the top option in AskUserQuestion. Walk down each branch of the design tree, resolving dependencies one-by-one.

### Rules

| Rule                      | Detail                                                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Code-resolvable questions | If the answer lives in the code, run ugrep / bfs instead of asking                                                                       |
| Question budget           | Cap at 7 across the phase. If hitting cap with branches still open, summarise the unresolved set and let user decide whether to continue |
| Stop conditions           | All decision branches resolved, user signals "enough", or budget hit                                                                     |

### Output to Phase 2

Aggregate grill findings into critic-design input schema before spawning.

| Field            | Source                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| source           | "user-grill"                                                                                             |
| artifact_type    | inferred from $ARGUMENTS (spec / plan / design / ADR / doc)                                              |
| approach         | one-line summary of the proposal core                                                                    |
| decisions        | architectural-level decisions crystallised during grill (terminology checks and scope minutiae excluded) |
| trade-offs       | trade-offs surfaced during grill                                                                         |
| referenced_files | files cited or read during grill                                                                         |

## Phase 2 Devil

| Step | Action                                                                                                                           |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Compose Phase 2 input from Phase 1 aggregation + original $ARGUMENTS context                                                     |
| 2    | Spawn critic-design via Task (subagent_type: critic-design, background: false). Mention ARCHITECTURE.md or equivalent if present |
| 3    | Wait for completion, capture verdict + weaknesses                                                                                |

## Output

| Section          | Content                                                     |
| ---------------- | ----------------------------------------------------------- |
| Grill summary    | Surfaced assumptions, decisions, trade-offs (one-line each) |
| Devil verdict    | critic-design output verbatim                               |
| Actionable items | Top 3 concrete actions (keep / remove / revise)             |
