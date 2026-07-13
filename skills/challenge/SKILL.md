---
name: challenge
description: Two-phase challenge that judges whether a discovered problem is real and whether a proposed idea is usable. Phase 1 loops subagent verification and advisor judgment over evidence (OUTCOME.md + parallel subagents) to self-resolve design-tree branches, asking the user only the irreversible residual and proceeding on stated assumptions for the rest. Phase 2 spawns two critic-design subagents (internal attack / OUTCOME.md attack) as devil's advocate input. The verdict leads the output as a simple GO / NO-GO. Do NOT use for code review findings (use /audit) or outcome assertion (use /assert which has built-in adversarial testing).
when_to_use: devils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し, grill me, 壁打ち
allowed-tools: Read LS Task AskUserQuestion
model: opus
argument-hint: "[proposal file | description]"
---

# /challenge - GO / NO-GO verdict on a proposal

Judge in two phases whether a discovered problem is real and a proposed idea usable, so the next decision starts from a verified GO / NO-GO.

## Input

`$ARGUMENTS` carries the target (a proposal file path or description). If empty, stop and ask the user to specify the target; do not infer it from the conversation. When multi-line, treat the first line as the target title and pass it verbatim, unparaphrased, into the critic-design spawn prompts.

## Phase 1 Grill

Grill the proposal from evidence on its own, then return only the unresolved residual to the user, sorted by reversibility.

1. Read OUTCOME.md if present. If absent, infer the outcome from $ARGUMENTS and the conversation and confirm it via AskUserQuestion. The confirmed outcome becomes the evaluation axis of the Phase 2 outcome attack
2. List the open questions in the proposal and sort each into fact (evidence settles it to one answer) or preference (a choice over priority / scope / trade-offs). Sort by the nature of the question, not by advisor confidence
3. Run the verification loop. subagents check facts in parallel, advisor re-checks the sorting and names the next evidence to get, and the main session decides whether to continue. Break when more evidence no longer changes the sorting (cap 3 rounds). Questions left unverified carry over to the residual
4. If a verified fact overturns the proposal's core (the targeted state already holds, or it contradicts a fact), skip Phase 2 and put the grounds for overturning in the Why. Do not stop on advisor opinion alone. If only a sub-claim broke, proceed on the surviving part
5. The questions left are the residual. advisor attaches a hypothesis plus reversibility / blast-radius to each, and only the irreversible or high-impact ones go to AskUserQuestion (cap 7). Proceed on the hypothesis as an assumption for the rest. Keep every residual advanced on assumption and every question delegated to subagents in the Why

### Input to Phase 2

Aggregate the Phase 1 findings into the critic-design input schema before spawning.

| Field            | Source                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| source           | user-grill                                                                                                                               |
| artifact_type    | inferred from $ARGUMENTS (spec / plan / design / ADR / doc)                                                                              |
| approach         | one-line summary of the proposal core                                                                                                    |
| decisions        | architecture-level decisions settled in Phase 1 (terminology checks and scope minutiae excluded)                                         |
| trade-offs       | trade-offs surfaced in Phase 1                                                                                                           |
| referenced_files | files read in Phase 1                                                                                                                    |
| outcome_ref      | OUTCOME.md path plus a digest of its done state / non-goals / constraints. If OUTCOME.md is absent, use the outcome confirmed in Phase 1 |

## Phase 2 Devil

Land the Phase 1 material on two critic-design (internal attack / OUTCOME.md attack), adversarially probing for holes.

| Pass                     | Role                                                                       |
| ------------------------ | -------------------------------------------------------------------------- |
| advisor                  | Evidence synthesis / self-consistency check / sorting audit                |
| critic-design (internal) | Attack the proposal on its own terms (hidden weaknesses and failure paths) |
| critic-design (outcome)  | Attack whether it reaches the outcome (fit / non-goal / constraint breach) |

1. Compose the input from the Phase 1 aggregation and the original `$ARGUMENTS`
2. Spawn two critic-design via Task in parallel (subagent_type: critic-design, run_in_background: false). One handles the internal attack, the other takes `outcome_ref` for the outcome attack (omit when no outcome is available). Mention `ARCHITECTURE.md` if present. Include the target title verbatim in each spawn prompt, and have each return a single JSON object `{ verdict: "GO" | "NO-GO", weaknesses: string[] }`
3. Wait for both, reconcile the verdicts and weaknesses, and drop the overlap
4. Aggregate the overall verdict and the Phase 1 residuals into VERDICT_SCHEMA (`{ verdict, assumptions: [{ text, irreversible, underspecified }] }`). When an irreversible assumption remains, assumptions exceed 7, or an underspecified assumption exists, downgrade to NO-GO regardless of how good the content looks, and never hand-override it back to GO

## Output

Put the verdict first, the backing in Why, and the next move in Actionable items.

| Section          | Content                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Verdict          | GO / NO-GO, one line, first. Note the condition if conditional, and the reason if downgraded                                                   |
| Why              | Fact-verification results, the two critic-design verdicts (internal / outcome), and every residual advanced on assumption (with reversibility) |
| Actionable items | Top 3 concrete actions (keep / remove / revise)                                                                                                |
