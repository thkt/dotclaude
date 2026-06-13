# Audit Output Template

Output is rendered from `snapshot.json` (the canonical source. See ADR 0047 and `references/snapshot-schema.md`). Every value below traces back to a snapshot field; do not surface data that has no snapshot origin. Leader orchestrates the render; integrator fills snapshot.

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

> Pipeline: {pipeline_health.reviewers_completed} reviewers completed
>
> Skipped reviewers (no findings reported for these areas):
>
> - {domains_skipped[i]} (one bullet per entry; format `<domain>: <reason>`)
>
> Omit the entire blockquote if `domains_skipped` is empty and all `*_completed` are true.
> Omit only the "Skipped reviewers" subsection if `domains_skipped` is empty but a `*_completed` is false.

---

## Root Causes

One row per finding whose id starts with `RC-`.

| ID                | Description            | Findings resolved       | Effort                |
| ----------------- | ---------------------- | ----------------------- | --------------------- |
| {findings[RC].id} | {findings[RC].message} | {findings[RC].resolves} | {findings[RC].effort} |

`Findings resolved` and `Effort` are integrator-supplied fields on RC-\* entries.
Omit this section if no finding starts with `RC-`.

---

## Quick Fixes

One row per auto-applicable suggestion. Auto-fix candidates are findings with
`fix_type: auto`, `status: open | confirmed`, and `severity: low | medium`. The
integrator sets `fix_type` per snapshot.json when a known fix pattern applies
without ambiguity (typically a single-line replacement).

| ID                  | Location              | Effort  | Rationale                |
| ------------------- | --------------------- | ------- | ------------------------ |
| {findings[auto].id} | {findings[auto].file} | 5-15min | {findings[auto].message} |

Apply: `/fix <ID>`. Omit section if no auto-fix candidates.

---

## Static Tool Findings

Findings from deterministic tools (oxlint, knip, tsgo, react-doctor). These bypass challenger/verifier; the tool output is the evidence. Wave 1 findings at the same `file:line` strengthen the signal and appear with cross-references in the next section.

| ID                | Severity                | Category                | Location            |
| ----------------- | ----------------------- | ----------------------- | ------------------- |
| {findings[PF].id} | {findings[PF].severity} | {findings[PF].category} | {findings[PF].file} |

Omit this section if no `status: static` finding exists.

---

## Confirmed Findings

All findings with `status: confirmed`, sorted by severity descending.

| ID               | Severity               | Category               | Location           |
| ---------------- | ---------------------- | ---------------------- | ------------------ |
| {findings[*].id} | {findings[*].severity} | {findings[*].category} | {findings[*].file} |

---

## Needs Review

Disputed by challenger but verified by verifier. Needs human judgement.

| ID                | Location            | Reason                 |
| ----------------- | ------------------- | ---------------------- |
| {findings[nr].id} | {findings[nr].file} | {findings[nr].message} |

Omit this entire section if there are no findings in this state.

---

## Actions

Findings grouped by relation to the audit scope. Default policy. Resolve all in-scope findings before merge; defer only what is truly outside. Omit a row whose list is empty.

### In scope (resolve before merge)

| Tier       | Criteria                                                                             |
| ---------- | ------------------------------------------------------------------------------------ |
| Must-fix   | critical/high severity; security (any severity); fail-state pre_flight; broken tests |
| Should-fix | medium/low severity on files within the audit scope                                  |

### Out of scope

| Tier     | Criteria                                                      |
| -------- | ------------------------------------------------------------- |
| Followup | `finding.file` outside the audit scope (incidental discovery) |
| Discard  | Confirmed false positive after review                         |

Routing rule. Leader places each finding by checking its `file` against the audit scope. In-scope findings split by severity into Must-fix or Should-fix. Out-of-scope findings go to Followup. Discard requires explicit user decision.

Sort within each tier. Use priority score, highest first. Integrator computes it as `findings_resolved × max_severity × fixability` for RC entries, or `Impact × Reach × Fixability` for standalone findings.

---

## Fix Cycle

1. Apply: `/fix <ID>` (Quick Fixes above)
2. Re-audit modified files: `/audit <modified files>`
3. Repeat until satisfied
```

## Rendering Rules

| Rule              | Detail                                                                  |
| ----------------- | ----------------------------------------------------------------------- |
| Canonical source  | `snapshot.json` only. Do not render fields absent from snapshot.        |
| Delta format      | `+N` if positive, `-N` if negative, `-` if zero, `(first)` on first run |
| Severity order    | critical → high → medium → low                                          |
| Section omission  | See per-section rules; do not emit empty tables                         |
| Trust Score range | 0-100. See `references/snapshot-schema.md` for derivation               |

## First Recording

If `delta_from` is null (first run), all Delta columns display `(first)`.
