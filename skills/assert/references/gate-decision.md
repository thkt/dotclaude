# Gate Decision

Ternary Ready / Ready (caveat) / NotReady judgment for /assert, derived from reconciled evidence. No numeric score.

## Outcome Basis

Goal: answer "can this change merge safely?" with a discrete signal that distinguishes "fully verified clean" from "static-only clean (dynamic evidence missing)" from "blockers exist." Plus a structured list of blockers and their fixes.

Judgment rule: any issue or test failure blocks the gate as NotReady. Bootstrap failure alone does not block as NotReady, but it downgrades a clean Ready to Ready (caveat) because dynamic evidence is missing.

## Issue Set Construction

The integrator merges `reconciled findings` (challenger / verifier on Phase 1 deduped findings) and `promoted adversarial findings` (Phase 3 intent-triage survivors) into a single `issues` set:

| Step | Action                                                              |
| ---- | ------------------------------------------------------------------- |
| 1    | Dedup by `file:line` only. Category schemas differ between sources  |
| 2    | On collision: keep highest severity, retain ALL source tags as list |
| 3    | The merged set is what `Issues` count refers to in the Gate Rule    |

Source tags: `challenger`, `verifier`, `adversarial`. Multi-source detections appear with all tags, e.g. `[challenger, adversarial]`.

## Gate Rule

| Input  | Required for Ready                 | Required for Ready (caveat)                 |
| ------ | ---------------------------------- | ------------------------------------------- |
| Build  | pass (or skipped: no build script) | skipped (env failure at bootstrap Step 1-3) |
| Tests  | pass / no-runner                   | skipped (env failure at bootstrap Step 1-3) |
| Issues | 0                                  | 0                                           |

Ready = bootstrap completed cleanly AND build pass (or no build script) AND tests pass/no-runner AND Issues = 0. Ready (caveat) = bootstrap Step 1-3 failed (env) AND Issues = 0; build/tests are recorded as skipped. NotReady = any of: build fail (Step 4 smoke broken), test fail, Issues > 0.

Critical: Step 4 smoke fail (`Build = fail`) NEVER routes to Ready (caveat). Only Step 1-3 env failures (`Build = skipped`) do. See Bootstrap Failure Handling below.

Zero-tolerance on issues: /assert is the independent outcome check. One issue is enough to NotReady regardless of source. Severity (high/medium/low) is preserved in the issues list as a fix-priority hint, but does not gate Ready/Ready (caveat)/NotReady.

## Evidence Table

Informational, always emitted. Not a score.

| Check       | Value                                                                     |
| ----------- | ------------------------------------------------------------------------- |
| Build       | pass / fail / skipped                                                     |
| Tests       | pass / fail (N passed, M failed) / skipped / no-runner                    |
| Issues      | 0 / N total. Breakdown by source: X challenger, Y verifier, Z adversarial |
| Adversarial | N/M passed (M failed → triage promoted K) / skipped                       |

## Bootstrap Failure Handling

Bootstrap has two failure modes that route to different gate outcomes. The orchestrator MUST distinguish them.

| Failure mode                        | Build column | Tests column | Gate path                                                           |
| ----------------------------------- | ------------ | ------------ | ------------------------------------------------------------------- |
| Step 1-3 fail (env: worktree, deps) | `skipped`    | `skipped`    | Ready (caveat) when Issues=0, NotReady when Issues>0                |
| Step 4 fail (build smoke broken)    | `fail`       | `skipped`    | NotReady regardless of Issues (build fail is a verdict on the code) |
| No build script (skipped at Step 4) | `skipped`    | proceed      | Treated like normal run; build column is informational only         |

| Component   | Treatment after Step 1-3 fail                                                     |
| ----------- | --------------------------------------------------------------------------------- |
| Adversarial | `skipped`. Cannot contribute to Issues count                                      |
| Issues      | Challenger / verifier still run on static code. Full gate weight (NotReady on >0) |

Rationale: Step 1-3 failure is environmental (no worktree, no internet, install crash) and not a verdict on the code, so penalizing it as NotReady would make every run in a broken environment useless. Step 4 failure means the code under assertion does not build, which IS a verdict on the code, so it must NotReady. Conflating them would let "build is broken but reviewers found nothing" land on Ready (caveat) and ship to merge — exactly the false-Ready outcome the ternary gate exists to prevent.

Ready (caveat) preserves the dynamic-evidence-gap signal for the legitimate environmental case only.

## Ralph Loop Integration

| Condition             | Action                                                                     |
| --------------------- | -------------------------------------------------------------------------- |
| gate = Ready          | Emit `<promise>PASS</promise>`, exit loop                                  |
| gate = Ready (caveat) | Output Blockers (none) + caveat note. Continue iteration. NO PASS emission |
| gate = NotReady       | Output Blockers with Fix suggestions. Continue iteration. NO PASS emission |

Rationale for Ready (caveat) NOT emitting PASS: Ralph Loop should not exit on possibly-untested code. Continuing the loop gives the user a chance to restore the environment and re-run, or to consciously accept the caveat by stopping the loop manually.
