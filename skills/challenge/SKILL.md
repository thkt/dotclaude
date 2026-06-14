---
name: challenge
description: Two-phase challenge that judges whether a discovered problem is real and whether a proposed idea is usable. Phase 1 loops subagent verification and advisor judgment over evidence (OUTCOME.md + parallel subagents) to self-resolve design-tree branches, asking the user only the irreversible residual and proceeding on stated assumptions for the rest. Phase 2 spawns two critic-design subagents (internal attack + OUTCOME.md attack) as devil's advocate input. The verdict leads the output as a simple GO / NO-GO. Do NOT use for code review findings (use /audit) or outcome assertion (use /assert which has built-in adversarial testing).
when_to_use: devils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し, grill me, 壁打ち
allowed-tools: Read LS Task Bash(ugrep:*) Bash(bfs:*) AskUserQuestion
model: opus
argument-hint: "[proposal file | description]"
---

# /challenge - GO / NO-GO verdict on a proposal

Judge in two phases whether a discovered problem is real and a proposed idea usable. Phase 1 grills from evidence on its own, Phase 2 lands two critic-design as devil's advocate. The next decision then proceeds on a verified GO / NO-GO.

## Input

- `$ARGUMENTS`: what to challenge (proposal file path or description)
- If `$ARGUMENTS` is empty: stop and ask user to specify target. Silent target inference from conversation has high misfire risk.

## Phase 1 Grill

Self-resolve from evidence, then sort the residual by reversibility. Block only the irreversible branches, proceed on stated assumptions for the rest, and let the user veto after the run.

1. Read OUTCOME.md if present. Its done state / non-goals / constraints stand in for part of the user's intent (consistent with PREFLIGHT). If absent, infer the outcome from $ARGUMENTS and the conversation and confirm it via AskUserQuestion. Pass the confirmed outcome to the Phase 2 outcome critic as its evaluation axis
2. Enumerate design-tree branches and classify each as fact (uniquely determined by evidence) or preference (priority / scope intent / trade-off choice). Split mechanically by question type, not by advisor confidence. Treating a preference as fact guts the grill
3. Run the loop. subagents verify fact branches in parallel → advisor synthesizes + audits the classification + names the next evidence gap → the main session organizes the results and decides whether to continue. Break when no further evidence would change the classification. Cap at 3 rounds; branches unresolved after 3 rounds fall to the residual
4. If a verified fact branch falsifies the proposal's core claim (the core targets a state that already holds, or a verified fact contradicts it), halt and skip Phase 2. If the core is alive and only a sub-claim is dead, proceed on the live remainder. Halt only on a refutation backed by fact-branch evidence, not on advisor opinion alone. critic-design on a dead proposal is wasted. Put the refutation in the Devil verdict slot of the output
5. The residual at break is the proven preference. advisor scores each residual with a best-guess plus reversibility / blast-radius
6. Ask via AskUserQuestion only the irreversible or high-impact residual (cap 7). For the rest, proceed on the best-guess as a stated assumption logged in the output Assumptions. Keep the branches skipped via subagent and the residuals advanced on assumption in the output, leaving the user a way to veto a misjudgement

### Output to Phase 2

Aggregate grill findings into critic-design input schema before spawning.

| Field            | Source                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| source           | "user-grill"                                                                                                                            |
| artifact_type    | inferred from $ARGUMENTS (spec / plan / design / ADR / doc)                                                                             |
| approach         | one-line summary of the proposal core                                                                                                   |
| decisions        | architectural-level decisions crystallised during grill (terminology checks and scope minutiae excluded)                                |
| trade-offs       | trade-offs surfaced during grill                                                                                                        |
| referenced_files | files cited or read during grill                                                                                                        |
| outcome_ref      | OUTCOME.md path plus a digest of its done state / non-goals / constraints. If OUTCOME.md is absent, use the outcome confirmed in Step 1 |

## Phase 2 Devil

Split the roles across the Phase 1 advisor and two Phase 2 critics to avoid a duplicated adversarial pass. Keep critic-design's devil's advocate nature (adversarially probing for holes) intact and split only the attack axis into internal and OUTCOME.md.

| Pass                             | Role                                                                                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 advisor                  | Evidence synthesis + self-consistency check against gathered evidence + classification audit                                                                         |
| Phase 2 critic-design (internal) | Attack the proposal on its own terms (hidden weaknesses, failure modes)                                                                                              |
| Phase 2 critic-design (outcome)  | Attack whether it reaches the outcome (OUTCOME.md or the one confirmed in Step 1) on outcome fit / non-goal / constraint breach. Skip only when neither is available |

| Step | Action                                                                                                                                                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Compose Phase 2 input from Phase 1 aggregation + original $ARGUMENTS context                                                                                                                                                                                  |
| 2    | Spawn two critic-design via Task in parallel (subagent_type: critic-design, background: false). One attacks internally, one takes outcome_ref to attack the outcome. Skip the outcome one only if no outcome is available. Mention ARCHITECTURE.md if present |
| 3    | Wait for both, reconcile verdicts + weaknesses (dedupe overlap)                                                                                                                                                                                               |

## Output

The point of challenge is to judge whether a discovered problem is real and whether a proposed idea is usable. Lead with the Verdict; everything after it backs the judgment and names the next move.

| Section          | Content                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Verdict          | GO / NO-GO. Note the condition if conditional. One line, first                                    |
| Why              | The fact-branch evidence behind the verdict (reproduction / refutation)                           |
| Grill summary    | Surfaced assumptions, decisions, trade-offs (one-line each)                                       |
| Evidence scope   | List of branches self-resolved, plus a note that the verdict is a challenge within evidence range |
| Assumptions      | Residuals advanced on a best-guess and their reversibility. The user's veto targets               |
| Devil verdict    | Both critic-design verdicts (internal + outcome), reconciled                                      |
| Actionable items | Top 3 concrete actions (keep / remove / revise)                                                   |
