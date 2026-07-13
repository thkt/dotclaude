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

`$ARGUMENTS` may contain the challenge target (a proposal file path or description). If empty, stop and ask the user to specify the target, since silent inference from the conversation has high misfire risk. If non-empty, treat it as the challenge target. When `$ARGUMENTS` is a multi-line description, its first line is the challenge target title; pass that first line verbatim, unparaphrased, into the critic-design spawn prompts.

## Phase 1 Grill

Grill the proposal from evidence on its own, then return only the unresolved residual to the user, sorted by reversibility.

1. Read OUTCOME.md if present (its done state / non-goals / constraints stand in for part of the user's intent). If absent, infer the outcome from $ARGUMENTS and the conversation and confirm it via AskUserQuestion. Pass the confirmed outcome to the Phase 2 outcome critic as its evaluation axis
2. List the open questions in the proposal and sort each into fact (a question evidence settles to one answer) or preference (one needing a choice, such as priority / scope / trade-off). Sort by the nature of the question, not by advisor confidence
3. Run a loop to verify the facts. subagents check facts in parallel, advisor re-checks the sorting from the results and names the next evidence to get, and the main session decides whether to continue. Break when no further evidence would change the sorting (cap 3 rounds). Questions left unresolved fall to the residual
4. If a verified fact overturns the proposal's core (the core targets a state that already holds, or contradicts a fact), stop, skip Phase 2, and put the grounds for overturning in the Why. Do not stop on advisor opinion alone. If the core survives and only a sub-claim is broken, proceed on the surviving part
5. The questions left at break are the residual. advisor scores each residual with a best-guess plus reversibility / blast-radius, then asks via AskUserQuestion only the irreversible or high-impact ones (cap 7). For the rest, proceed on the best-guess as an assumption. Keep the residuals advanced on assumption and the questions skipped via subagent in the Why, leaving the user a way to veto later

### Output to Phase 2

Aggregate grill findings into critic-design input schema before spawning.

| Field            | Source                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| source           | user-grill                                                                                                                               |
| artifact_type    | inferred from $ARGUMENTS (spec / plan / design / ADR / doc)                                                                              |
| approach         | one-line summary of the proposal core                                                                                                    |
| decisions        | architectural-level decisions crystallised during grill (terminology checks and scope minutiae excluded)                                 |
| trade-offs       | trade-offs surfaced during grill                                                                                                         |
| referenced_files | files cited or read during grill                                                                                                         |
| outcome_ref      | OUTCOME.md path plus a digest of its done state / non-goals / constraints. If OUTCOME.md is absent, use the outcome confirmed in Phase 1 |

## Phase 2 Devil

Land the Phase 1 material on two critic-design (internal attack / OUTCOME.md attack), adversarially probing for holes.

| Pass                     | Role                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------- |
| advisor                  | Evidence synthesis / self-consistency check / sorting audit                        |
| critic-design (internal) | Attack the proposal on its own terms (hidden weaknesses, failure modes)            |
| critic-design (outcome)  | Attack whether it reaches the outcome (outcome fit / non-goal / constraint breach) |

1. Compose the Phase 2 input from the Phase 1 aggregation and the original $ARGUMENTS context
2. Spawn two critic-design via Task in parallel (subagent_type: critic-design, run_in_background: false). One handles the internal attack, the other takes `outcome_ref` for the outcome attack (skip when no outcome is available). Mention `ARCHITECTURE.md` if present. Include the challenge target title verbatim in each spawn prompt, and instruct each critic-design to return its result as a single JSON object `{ verdict: "GO" | "NO-GO", weaknesses: string[] }`
3. Wait for both, reconcile verdicts and weaknesses, and dedupe overlap
4. Aggregate the overall verdict and the Phase 1 residuals into VERDICT_SCHEMA (`{ verdict, assumptions: [{ text, irreversible, underspecified }] }`). When an irreversible assumption remains, assumptions exceed 7, or an underspecified assumption exists, downgrade to NO-GO regardless of how good the content looks, and never hand-override it back to GO

## Output

Lead with the Verdict, concentrate the backing in Why, name the next move in Actionable items.

| Section          | Content                                                                                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verdict          | GO / NO-GO, one line, first. Note the condition if conditional, and the reason if downgraded (e.g. `NO-GO (reason: irreversible-assumption)`)                                                                                                              |
| Why              | Show the fact-verification results (reproduction / refutation) and the two critic-design verdicts (internal / outcome). Keep every residual advanced on a best-guess and every question skipped via subagent, with reversibility (the user's veto targets) |
| Actionable items | Top 3 concrete actions (keep / remove / revise)                                                                                                                                                                                                            |
