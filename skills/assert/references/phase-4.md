# Phase 4: Evidence Synthesis and Gate Decision

Covers evidence synthesis by `enhancer-evidence`, the ternary gate (§ Ternary Gate) decision, and its decode.

Spawn `enhancer-evidence` as a single background Task. Inputs are listed below; the return value is root causes + Gate decision + report (including the structured blocker list and fix suggestions). For `issues` set construction see § Issue Set Construction, for gate evaluation see § Gate Rule.

| Input               | Source                                                  | Handling / Notes                                |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| Outcome reference   | `.claude/OUTCOME.md` Behavior / Non-goals / Constraints | Cached during Pre-flight                        |
| Challenger output   | Raw challenger output                                   | Reconciled internally by enhancer-evidence      |
| Verifier output     | Raw verifier output                                     | Reconciled internally by enhancer-evidence      |
| Outcome evidence    | Bootstrap smoke test (build) + Phase 1c (test)          | Both results merged                             |
| Adversarial results | Findings promoted in Phase 3                            | Merged into issues with the `[adversarial]` tag |

## Ternary Gate

Answers "can this change merge safely?" with one of three states; no continuous value such as a score is used. See § Gate Rule for the decision and § Bootstrap Failure Handling for the downgrade.

| Gate           | Meaning                                     |
| -------------- | ------------------------------------------- |
| Ready          | Fully verified clean                        |
| Ready (caveat) | Static-only clean, dynamic evidence missing |
| NotReady       | Blockers exist                              |

## Outcome Basis

The standard for "safely" is `.claude/OUTCOME.md`. The orchestrator reads it during Pre-flight and feeds Behavior / Non-goals / Constraints to `enhancer-evidence`. When absent, generate it via `/outcome` before proceeding.

Findings that contradict a Constraint or violate a Non-goal carry the same weight in the issues set, whether flagged by challenger / verifier or promoted by adversarial.

## Issue Set Construction

The integrator merges the `reconciled findings` from challenger / verifier (Phase 1) and the `promoted adversarial findings` (Phase 3) into a single `issues` set. Source tags are `challenger` / `verifier` / `adversarial`; a finding detected by multiple sources lists all tags, e.g. `[challenger, adversarial]`.

| Step | Action                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------- |
| 1    | Dedup by `file:line` only (category schemas differ between sources, so category is not part of the dedup key) |
| 2    | On collision, keep the highest severity and retain all source tags as a list                                  |
| 3    | The merged set is what the `Issues` count in the Gate Rule refers to                                          |

## Gate Rule

NotReady results from any of build fail (Step 4 smoke broken), test fail, or one or more Issues. Step 4 smoke fail (`Build = fail`) never routes to Ready (caveat); only Step 1-3 env failures (`Build = skipped`) do (§ Bootstrap Failure Handling).

`/assert` is an independent outcome check; only zero issues are accepted, and a single issue means NotReady regardless of source. Severity (high/medium/low) stays in the issues list as a fix-priority hint but does not affect the gate decision.

| Input  | Required for Ready                 | Required for Ready (caveat)                 |
| ------ | ---------------------------------- | ------------------------------------------- |
| Build  | pass (or skipped: no build script) | skipped (env failure at bootstrap Step 1-3) |
| Tests  | pass or no-runner                  | skipped (env failure at bootstrap Step 1-3) |
| Issues | 0                                  | 0                                           |

## Evidence Table

The gate is determined by the decision JSON in § Gate Decode, not recomputed from this table. Always emitted in the report.

| Check       | Value                                                                      |
| ----------- | -------------------------------------------------------------------------- |
| Build       | pass or fail or skipped                                                    |
| Tests       | pass or fail (N passed, M failed) or skipped or no-runner                  |
| Issues      | 0 or N total. Breakdown by source: X challenger, Y verifier, Z adversarial |
| Adversarial | N/M passed (of the failed, K promoted via triage) or skipped               |

## Bootstrap Failure Handling

Bootstrap has two failure modes, and the orchestrator must distinguish them. A Step 1-3 failure is environmental (no worktree, no internet, install crash) and is not a verdict on the code. A Step 4 failure, by contrast, is a verdict on the code: the target does not build.

Conflating the two lets a "build is broken but reviewers found nothing" case merge as Ready (caveat), the false-Ready the ternary gate exists to prevent. Reserving Ready (caveat) for environmental failures preserves the signal that dynamic evidence is missing.

| Failure mode                        | Build column | Tests column | Gate path                                                           |
| ----------------------------------- | ------------ | ------------ | ------------------------------------------------------------------- |
| Step 1-3 fail (env: worktree, deps) | `skipped`    | `skipped`    | Ready (caveat) with 0 Issues, NotReady with one or more             |
| Step 4 fail (build smoke broken)    | `fail`       | `skipped`    | NotReady regardless of Issues (build fail is a verdict on the code) |
| No build script (skipped at Step 4) | `skipped`    | proceed      | Treated like normal run; build column is informational only         |

| Component   | Treatment after Step 1-3 fail                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Adversarial | `skipped`. Cannot contribute to Issues count                                                                  |
| Issues      | Challenger / verifier still run on static code and count toward the gate as usual (NotReady with one or more) |

## Gate Decode

The leader does not read the gate from prose; it mechanically decodes the fenced `json` decision block at the head of the enhancer-evidence report via ${CLAUDE_SKILL_DIR}/scripts/gate-decode.py. Reading from prose lets natural-language interpretation re-enter at the final step; the JSON contract closes that path. The enum and cross-check definitions live in the script as the single source.

After a clean decode, the leader takes the decoded gate verbatim as the final gate. The only downgrade is Ready to Ready (caveat), applied only when bootstrap Step 1-3 failed environmentally and the decoded findings = 0 (§ Bootstrap Failure Handling).

| Step | Action                                                                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Save the enhancer Task output to a file and pass it to gate-decode.py                                                                                |
| 2    | On exit 0, use the decision JSON (gate / findings / build / tests) from stdout verbatim                                                              |
| 3    | On exit 1 (missing block, parse failure, enum violation, cross-check mismatch), re-spawn the enhancer once; a second failure fail-closes to NotReady |

## /goal Integration

State completion only when gate = Ready. The `/goal` evaluator judges achievement from conversation output alone, so this one line is the completion evidence. On Ready (caveat) and NotReady, emit the report and continue without stating completion.

Ready (caveat) does not signal completion because a `/goal` loop should not exit on code that may be untested. Continuing lets the user either re-run after restoring the environment, or stop the loop and consciously accept the caveat.
