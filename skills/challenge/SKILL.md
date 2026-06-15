---
name: challenge
description: Two-phase challenge that judges whether a discovered problem is real and whether a proposed idea is usable. Phase 1 loops subagent verification and advisor judgment over evidence (OUTCOME.md + parallel subagents) to self-resolve design-tree branches, asking the user only the irreversible residual and proceeding on stated assumptions for the rest. Phase 2 spawns two critic-design subagents (internal attack / OUTCOME.md attack) as devil's advocate input. The verdict leads the output as a simple GO / NO-GO. Do NOT use for code review findings (use /audit) or outcome assertion (use /assert which has built-in adversarial testing).
when_to_use: devils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し, grill me, 壁打ち
allowed-tools: Read LS Task AskUserQuestion
model: opus
argument-hint: "[proposal file | description]"
---

# /challenge - GO / NO-GO verdict on a proposal

Judge in two phases whether a discovered problem is real and a proposed idea usable, so the next decision proceeds from a verified GO / NO-GO.

## Input

`$ARGUMENTS` may contain the challenge target (a proposal file path or description). If empty, stop and ask the user to specify the target, since silent inference from the conversation has high misfire risk. If non-empty, treat it as the challenge target.

## Phase 1 Grill

Grill the proposal from evidence on its own, then return only the unresolved residual to the user, sorted by reversibility.

1. Read OUTCOME.md if present. Its done state / non-goals / constraints stand in for part of the user's intent. If absent, infer the outcome from $ARGUMENTS and the conversation and confirm it via AskUserQuestion. Pass the confirmed outcome to the Phase 2 outcome critic as its evaluation axis
2. Enumerate design-tree branches and classify each as fact (uniquely determined by evidence) or preference (priority / scope intent / trade-off). Split mechanically by question type, not by advisor confidence. Treating a preference as fact guts the grill
3. Run the loop. subagents verify fact branches in parallel → advisor synthesizes + audits the classification + names the next evidence gap → the main session organizes the results and decides whether to continue. Break when no further evidence would change the classification. Cap at 3 rounds; branches unresolved after 3 rounds fall to the residual
4. If a verified fact branch falsifies the proposal's core claim (the core targets a state that already holds, or a verified fact contradicts it), halt and skip Phase 2. If the core is alive and only a sub-claim is dead, proceed on the live remainder. Halt only on a refutation backed by fact-branch evidence, not on advisor opinion alone. critic-design on a dead proposal is wasted. Put the refutation in the Devil verdict slot of the output
5. The residual at break is the proven preference. advisor scores each residual with a best-guess plus reversibility / blast-radius
6. Sort the residual by reversibility and impact. Ask via AskUserQuestion only the irreversible or high-impact ones (cap 7). For the rest, proceed on the best-guess as a stated assumption logged in the output Assumptions. Keep the branches skipped via subagent and the residuals advanced on assumption in the output, leaving the user a way to veto a misjudgement

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

Land the Phase 1 material on two critic-design (internal attack / OUTCOME.md attack), adversarially probing for holes.

| Pass                     | Role                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------- |
| advisor                  | Evidence synthesis / self-consistency check / classification audit                 |
| critic-design (internal) | Attack the proposal on its own terms (hidden weaknesses, failure modes)            |
| critic-design (outcome)  | Attack whether it reaches the outcome (outcome fit / non-goal / constraint breach) |

1. Compose the Phase 2 input from the Phase 1 aggregation and the original $ARGUMENTS context.
2. Spawn two critic-design via Task in parallel (subagent_type: critic-design, background: false). One handles the internal attack, the other takes outcome_ref for the outcome attack. Skip the outcome one when no outcome is available. Mention ARCHITECTURE.md if present.
3. Wait for both, reconcile verdicts and weaknesses, and dedupe overlap.

## Output

Lead with the Verdict; everything after it backs the judgment and names the next move.

| Section          | Content                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Verdict          | GO / NO-GO. Note the condition if conditional. One line, first                                    |
| Why              | The fact-branch evidence behind the verdict (reproduction / refutation)                           |
| Grill summary    | Surfaced assumptions, decisions, trade-offs (one-line each)                                       |
| Evidence scope   | List of branches self-resolved, plus a note that the verdict is a challenge within evidence range |
| Assumptions      | Residuals advanced on a best-guess and their reversibility. The user's veto targets               |
| Devil verdict    | Both critic-design verdicts (internal / outcome), reconciled                                      |
| Actionable items | Top 3 concrete actions (keep / remove / revise)                                                   |
