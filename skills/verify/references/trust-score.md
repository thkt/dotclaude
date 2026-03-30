# Trust Score Algorithm

Trust Score quantifies verification confidence from post-integrator reconciled evidence (0-100 integer).

## Components

| Component            | Max | Source                            |
| -------------------- | --- | --------------------------------- |
| Build                | 20  | Phase 1c outcome evidence         |
| Tests                | 20  | Phase 1c outcome evidence         |
| Reconciled findings  | 30  | Phase 3 integrator output         |
| Adversarial survival | 30  | Phase 2.5 intent-verified results |

Total = Build + Tests + Findings + Adversarial. Clamp to [0, 100].

## Build (0 or 20)

| Condition              | Score |
| ---------------------- | ----- |
| Build passes (exit 0)  | 20    |
| Build fails (exit > 0) | 0     |
| Bootstrap failed       | 10    |

| Bootstrap failure | Reason                      |
| ----------------- | --------------------------- |
| not 0 but 10      | static reviewers still ran  |
| not 20 but 10     | outcome evidence is missing |

## Tests (0 or 20)

| Condition            | Score |
| -------------------- | ----- |
| All tests pass       | 20    |
| Any test fails       | 0     |
| No test runner found | 10    |
| Bootstrap failed     | 10    |

Same rationale as Build for partial scores.

## Reconciled Findings (0-30)

Based on severity-weighted count of reconciled (post-integrator) findings.

```
weight = (high_count * 3) + (medium_count * 1)
score  = max(0, 30 - (weight * 3))
```

| Severity-weighted count | Score |
| ----------------------- | ----- |
| 0                       | 30    |
| 1-2                     | 27-24 |
| 3-5                     | 21-15 |
| 6-9                     | 12-3  |
| 10+                     | 0     |

Only reconciled findings count. Disputed findings (excluded by integrator) do
not affect the score.

## Adversarial Survival (0-30)

Based on pass rate of intent-verified adversarial tests.

```
survival_rate = passed_tests / total_tests
score = round(30 * survival_rate)
```

| Condition                  | Score |
| -------------------------- | ----- |
| All edge-case tests pass   | 30    |
| 80% pass                   | 24    |
| 50% pass                   | 15    |
| 0% pass                    | 0     |
| No adversarial tests ran   | 15    |
| Bootstrap failed (skipped) | 15    |

When adversarial testing is skipped (bootstrap failure or timeout), score
defaults to 15 (neutral). Not 0 (punitive) because absence of evidence is not
evidence of absence.

## Interpretation

| Range  | Meaning                                         | Suggested Action  |
| ------ | ----------------------------------------------- | ----------------- |
| 90-100 | High confidence. Code is independently verified | Proceed to merge  |
| 70-89  | Moderate. Some findings or partial evidence     | Review findings   |
| 50-69  | Low. Significant issues or missing evidence     | Address findings  |
| 0-49   | Critical. Build/test failures or many findings  | Block merge, /fix |

## Report Format

```markdown
Trust Score: NN/100

| Component            | Score | Detail                           |
| -------------------- | ----- | -------------------------------- |
| Build                | /20   | pass / fail                      |
| Tests                | /20   | pass / fail (N passed, M failed) |
| Reconciled findings  | /30   | N findings (H high, M medium)    |
| Adversarial survival | /30   | N/M edge-case tests passed       |
```
