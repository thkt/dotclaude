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

The rule for severity normalization and dedup by `file:line` (on collision keep the highest severity and union the source tags into a list) is owned by `scripts/merge-findings.py`, which the Phase 1→2 transition (references/phase-1.md § Finding Deduplication) runs directly. The integrator applies the same rule when merging. The merged set is what the `Issues` count in the Gate Rule refers to.

## Gate Rule

NotReady results from any of build fail (build smoke broken), test fail, or one or more Issues. A build smoke fail (`Build = fail`) never routes to Ready (caveat); only env failures (`Build = skipped`) do (§ Bootstrap Failure Handling).

`/assert` is an independent outcome check; only zero issues are accepted, and a single issue means NotReady regardless of source. Severity (high/medium/low) stays in the issues list as a fix-priority hint but does not affect the gate decision.

| Input  | Required for Ready                 | Required for Ready (caveat)     |
| ------ | ---------------------------------- | ------------------------------- |
| Build  | pass (or skipped: no build script) | skipped (bootstrap env failure) |
| Tests  | pass or no-runner                  | skipped (bootstrap env failure) |
| Issues | 0                                  | 0                               |

## Evidence Table

The gate is determined by the decision JSON in § Gate Decode, not recomputed from this table. Always emitted in the report.

| Check       | Value                                                                      |
| ----------- | -------------------------------------------------------------------------- |
| Build       | pass or fail or skipped                                                    |
| Tests       | pass or fail (N passed, M failed) or skipped or no-runner                  |
| Issues      | 0 or N total. Breakdown by source: X challenger, Y verifier, Z adversarial |
| Adversarial | N/M passed (of the failed, K promoted via triage) or skipped               |

## Bootstrap Failure Handling

Bootstrap has two failure modes, and the orchestrator distinguishes them. An env failure is no worktree, no internet, or an install crash; a build smoke failure is the target not building. Downgrading a build smoke fail to caveat would create a false-Ready (a merge that misses a broken build), so caveat is reserved for environmental failures.

| Failure mode              | Build column | Tests column | Gate path                                                           |
| ------------------------- | ------------ | ------------ | ------------------------------------------------------------------- |
| Env fail (worktree, deps) | `skipped`    | `skipped`    | Ready (caveat) with 0 Issues, NotReady with one or more             |
| Build smoke fail          | `fail`       | `skipped`    | NotReady regardless of Issues (build fail is a verdict on the code) |
| No build script           | `skipped`    | proceed      | Treated like normal run; build column is informational only         |

| Component   | Treatment after env fail                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Adversarial | `skipped`. Cannot contribute to Issues count                                                                  |
| Issues      | Challenger / verifier still run on static code and count toward the gate as usual (NotReady with one or more) |

## Gate Decode

The leader does not read the gate from prose; it mechanically decodes the fenced `json` decision block at the head of the enhancer-evidence report via `${CLAUDE_SKILL_DIR}/scripts/gate-decode.py`. The enum and cross-check definitions live in the script as the single source.

After a clean decode, the leader takes the decoded gate verbatim as the final gate. The only downgrade is Ready to Ready (caveat), applied only when bootstrap failed environmentally and the decoded findings = 0 (§ Bootstrap Failure Handling).

| #   | Action                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Save the enhancer Task output to a file and pass it to gate-decode.py                                                                                |
| 2   | On exit 0, use the decision JSON (gate / findings / build / tests) from stdout verbatim                                                              |
| 3   | On exit 1 (missing block, parse failure, enum violation, cross-check mismatch), re-spawn the enhancer once; a second failure fail-closes to NotReady |

## /goal Integration

State completion only when `gate = Ready`. On Ready (caveat) and NotReady, emit the report and continue without stating completion. Ready (caveat) does not state completion so a `/goal` loop does not exit on code that may be untested.
