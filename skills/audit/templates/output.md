# Audit Output Template

Output is rendered from `snapshot.yaml` (the canonical source — see ADR 0047).
Every value below traces back to a snapshot field; do not surface data that has
no snapshot origin. Leader orchestrates the render; integrator fills snapshot.

## Template

```markdown
# Audit Report

## Pre-flight

| Check    | Status                                           | Delta          |
| -------- | ------------------------------------------------ | -------------- |
| Build    | {pre_flight.build}                               | -              |
| Clippy   | {pre_flight.clippy}                              | {delta.clippy} |
| Fmt      | {pre_flight.fmt}                                 | {delta.fmt}    |
| Tests    | {pre_flight.tests.pass}/{pre_flight.tests.total} | {delta.tests}  |
| Coverage | {pre_flight.coverage}                            | -              |

Omit a row whose snapshot field is `skipped` and whose delta is `-`.

## Summary

| Severity | Count              | Delta            |
| -------- | ------------------ | ---------------- |
| Critical | {summary.critical} | {delta.critical} |
| High     | {summary.high}     | {delta.high}     |
| Medium   | {summary.medium}   | {delta.medium}   |
| Low      | {summary.low}      | {delta.low}      |

Trust Score: {summary.trust_score} / 100
FP rate: {summary.dismissed} / ({summary.total_findings} + {summary.dismissed}) dismissed by challenger

> Pipeline: {pipeline_health.reviewers_completed} reviewers completed |
> Skipped: {pipeline_health.domains_skipped}
>
> (Omit this blockquote if `domains_skipped` is empty and all `*_completed` are true.)

---

## Root Causes

One row per finding whose id starts with `RC-`.

| ID                | Description          | Findings resolved         | Effort                |
| ----------------- | -------------------- | ------------------------- | --------------------- |
| {findings[RC].id} | {findings[RC].message} | {findings[RC].resolves} | {findings[RC].effort} |

`Findings resolved` and `Effort` are integrator-supplied fields on RC-* entries.
Omit this section if no finding starts with `RC-`.

---

## Quick Fixes

One row per auto-applicable suggestion. Auto-fix candidates are findings whose
status is `open`, severity is `low` or `medium`, and location points to a
single line.

| ID                  | Location              | Effort  | Rationale                |
| ------------------- | --------------------- | ------- | ------------------------ |
| {findings[auto].id} | {findings[auto].file} | 5-15min | {findings[auto].message} |

Apply: `/fix <ID>`. Omit section if no auto-fix candidates.

---

## Confirmed Findings

All findings with `status: confirmed`, sorted by severity descending.

| ID               | Severity               | Category               | Location           |
| ---------------- | ---------------------- | ---------------------- | ------------------ |
| {findings[*].id} | {findings[*].severity} | {findings[*].category} | {findings[*].file} |

---

## Needs Review

Disputed by challenger but verified by verifier — needs human judgement.

| ID               | Location              | Reason                 |
| ---------------- | --------------------- | ---------------------- |
| {findings[nr].id} | {findings[nr].file}  | {findings[nr].message} |

Omit this entire section if there are no findings in this state.

---

## Actions

Grouped by timing. Omit a row whose list is empty.

| Priority         | Action                                          |
| ---------------- | ----------------------------------------------- |
| [!] Immediate    | critical/high findings or fail-state pre_flight |
| [→] This Sprint  | medium findings + auto-fixes                    |
| [→] Next Sprint  | low findings or structural refactors            |
| [○] Backlog      | minor improvements, priority score < 5          |

---

## Fix Cycle

1. Apply: `/fix <ID>` (Quick Fixes above)
2. Re-audit modified files: `/audit <modified files>`
3. Repeat until satisfied
```

## Rendering Rules

| Rule                    | Detail                                                                  |
| ----------------------- | ----------------------------------------------------------------------- |
| Canonical source        | `snapshot.yaml` only. Do not render fields absent from snapshot.        |
| Delta format            | `+N` if positive, `-N` if negative, `-` if zero, `(first)` on first run |
| Severity order          | critical → high → medium → low                                          |
| Section omission        | See per-section rules; do not emit empty tables                         |
| Trust Score range       | 0-100, per ADR 0035                                                     |

## First Recording

If `delta_from` is null (first run), all Delta columns display `(first)`.
