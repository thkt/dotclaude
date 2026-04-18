# Gate Decision

Binary Ready/NotReady judgment for /verify, derived from reconciled evidence.
No numeric score.

Priority / Gate / Finding Format canonical definitions: `formatting-audits`.

## Outcome Basis

Goal: answer "can this change merge safely?" with a binary signal, plus a
structured list of blockers and their fixes when the answer is no.

Judgment rule: any reconciled finding, build failure, test failure, or
adversarial failure blocks the gate. Absence of dynamic evidence (bootstrap
skipped) is not evidence of absence — it does not block by itself.

## Gate Rule

| Input                          | Required for Ready                        |
| ------------------------------ | ----------------------------------------- |
| Build                          | pass (or skipped when bootstrap failed)   |
| Tests                          | pass / no-runner (or skipped)             |
| Reconciled findings            | 0                                         |
| Adversarial failures           | 0 (or skipped)                            |

Ready = all four inputs satisfy the condition above.
NotReady = any input fails.

Zero-tolerance on findings: /verify is the independent outcome check. One
reconciled finding is enough to block. Severity (high/medium/low) is preserved
in the findings list as a fix-priority hint, but does not gate Ready/NotReady.

## Evidence Table

Informational, always emitted. Not a score.

| Check       | Value                                       |
| ----------- | ------------------------------------------- |
| Build       | pass / fail / skipped                       |
| Tests       | pass / fail (N passed, M failed) / skipped / no-runner |
| Findings    | 0 / N high, M medium, L low                 |
| Adversarial | N/M passed / skipped                        |

## Bootstrap Failure Handling

When Phase 0 bootstrap fails, dynamic evidence is unavailable. Static findings
still drive the gate.

| Component  | Treatment when bootstrap failed                         |
| ---------- | ------------------------------------------------------- |
| Build      | `skipped`. Does not block Ready.                        |
| Tests      | `skipped`. Does not block Ready.                        |
| Adversarial | `skipped`. Does not block Ready.                       |
| Findings   | Reviewers still run on static code. Full gate weight.   |

Rationale: bootstrap failure is environmental, not a verdict on the code.
Treating it as a blocker would penalize every run in a broken environment.

## Legacy Format Handling

Prior /verify reports may use the Trust Score (NN/100) format. The Diff from
Previous section must detect this and emit `Legacy format — diff skipped`. See
`formatting-audits` Legacy Format Handling.

## Ralph Loop Integration

| Condition    | Action                                      |
| ------------ | ------------------------------------------- |
| gate = Ready | Emit `<promise>PASS</promise>`, exit loop   |
| gate = NotReady | Output Blockers with Fix suggestions; continue iteration |
