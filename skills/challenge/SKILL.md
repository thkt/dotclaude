---
name: challenge
description: Two-phase challenge that judges whether a discovered problem is real and whether a proposed idea is usable. Phase 1 loops subagent verification and advisor judgment over evidence (OUTCOME.md + parallel subagents) to self-resolve design-tree branches, asking the user only the irreversible residual and proceeding on stated assumptions for the rest. Phase 2 spawns two critic-design subagents (internal attack / OUTCOME.md attack) as devil's advocate input. The verdict leads the output as a simple GO / NO-GO. Do NOT use for code review findings (use /audit) or outcome assertion (use /assert which has built-in adversarial testing).
when_to_use: devils advocate, 反論, チャレンジ, challenge, 叩いて, 穴探し, grill me, 壁打ち
allowed-tools: Read LS Task AskUserQuestion Bash(node:*)
model: opus
argument-hint: "[proposal file | description]"
---

# /challenge - GO / NO-GO verdict on a proposal

Judge in two phases whether a discovered problem is real and a proposed idea usable, so the next decision proceeds from a verified GO / NO-GO.

## Input

`$ARGUMENTS` may contain the challenge target (a proposal file path or description). If empty, stop and ask the user to specify the target, since silent inference from the conversation has high misfire risk. If non-empty, treat it as the challenge target.

## Phase 1 Grill

Grill the proposal from evidence on its own, then return only the unresolved residual to the user, sorted by reversibility. Each open question in the proposal is either a fact or a preference; facts get verified and may overturn the core. A preference that survives verification becomes the residual, routed to the user by reversibility.

1. Read OUTCOME.md if present. Its done state / non-goals / constraints stand in for part of the user's intent. If absent, infer the outcome from $ARGUMENTS and the conversation and confirm it via AskUserQuestion. Pass the confirmed outcome to the Phase 2 outcome critic as its evaluation axis
2. List the open questions in the proposal and sort each into fact or preference. A fact is a question evidence settles to one answer; a preference is one needing a choice (priority / scope / trade-off). Sort by the nature of the question, not by advisor confidence. Do not treat a preference as fact
3. Run a loop to verify the facts. subagents check facts in parallel → advisor synthesizes, re-checks the sorting, and names the next evidence to get → the main session organizes the results and decides whether to continue. Break when no further evidence would change the sorting. Cap at 3 rounds; questions left unresolved fall to the residual
4. If a verified fact overturns the proposal's core (the core targets a state that already holds, or a verified fact contradicts it), stop and skip Phase 2. If the core survives and only a sub-claim is broken, proceed on the surviving part. Stop only when fact evidence backs it, not on advisor opinion alone. Put the grounds for overturning in the Why
5. The questions left at break are the residual, genuine preferences proven through verification. advisor scores each residual with a best-guess plus reversibility / blast-radius, then asks via AskUserQuestion only the irreversible or high-impact ones (cap 7). For the rest, proceed on the best-guess as a stated assumption logged in the output Why. Keep the questions skipped via subagent and the residuals advanced on assumption in the Why, leaving the user a way to veto later

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
2. Spawn two critic-design via Task in parallel (subagent_type: critic-design, run_in_background: false). One handles the internal attack, the other takes outcome_ref for the outcome attack (skip when no outcome is available). Mention ARCHITECTURE.md if present. Instruct each critic-design to return its result as a single JSON object `{ verdict: "GO" | "NO-GO", weaknesses: string[] }`
3. Wait for both, reconcile verdicts and weaknesses, and dedupe overlap
4. Aggregate the reconciled overall verdict and the Phase 1 residuals (best-guess assumptions, flagged irreversible / underspecified by reversibility) into a VERDICT_SCHEMA-equivalent JSON `{ verdict, assumptions: [{ text, irreversible, underspecified }] }` and pipe it on stdin to `node scripts/issue-gate/verdict-gate.mjs --title "<challenge target title verbatim>"`. Pass the challenge target title literally, not paraphrased (the script normalizes it). Take the returned verdict as the final judgment and do not hand-override it to GO. The gate downgrades a GO to NO-GO one-way on any irreversible assumption / more than 7 assumptions / underspecified

## Output

Lead with the Verdict, concentrate the backing in Why, name the next move in Actionable items.

| Section          | Content                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verdict          | GO / NO-GO. Note the condition if conditional. One line, first                                                                                                                                                                                                                                                                                                                                          |
| Why              | The fact-verification evidence (reproduction / refutation), the two critic-design verdicts (internal / outcome), the verdict-gate downgrade reasons if any (irreversible-assumption / max-assumptions / underspecified), and the residuals advanced on a best-guess with their reversibility (the user's veto targets). Close with a one-line note that the verdict is a judgment within evidence range |
| Actionable items | Top 3 concrete actions (keep / remove / revise)                                                                                                                                                                                                                                                                                                                                                         |
