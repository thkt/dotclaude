# Audit Output Template

Template for /audit command output.

## Template

```markdown
# Audit Report

## Summary

| Severity | Count                          | Delta            |
| -------- | ------------------------------ | ---------------- |
| Critical | {summary.by_severity.critical} | {delta.critical} |
| High     | {summary.by_severity.high}     | {delta.high}     |
| Medium   | {summary.by_severity.medium}   | {delta.medium}   |
| Low      | {summary.by_severity.low}      | {delta.low}      |

Auto-fixable: {suggestions.auto_fixable_count} | Manual: {suggestions.manual_count}
Verification: {summary.validation.verification.verified} verified | {summary.validation.verification.weak_evidence} weak | {summary.validation.verification.unverifiable} unverifiable

> **Pipeline**: {pipeline_health.domains_completed} | Skipped: {pipeline_health.domains_skipped} | Verification: {pipeline_health.verification_status}
> _(Omit this section if all domains completed and verification is full)_

---

## Quick Fixes

| ID                                    | Location                                                                                            | Effort                                    | Rationale                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------| ----------------------------------------- | -------------------------------------------- |
| {suggestions.items[fix_type=auto].id} | `{suggestions.items[fix_type=auto].location.file}:{suggestions.items[fix_type=auto].location.line}` | {suggestions.items[fix_type=auto].effort} | {suggestions.items[fix_type=auto].rationale} |

Apply: `/fix <ID>`

---

## Root Causes

| Root Cause                  | Findings Resolved                                                    |
| --------------------------- | -------------------------------------------------------------------- |
| {root_causes[].description} | {root_causes[].findings_resolved} ({root_causes[].domains_involved}) |

---

## Needs Review

> Disputed by Challenger but verified by Verifier. Requires human review.

| Finding                     | Location                  | Challenger Reason                     | Verifier Evidence                  |
| --------------------------- | ------------------------- | ------------------------------------- | ---------------------------------- |
| {needs_review[].finding_id} | {needs_review[].location} | {needs_review[].challenger_reasoning} | {needs_review[].verifier_evidence} |

---

## Actions

| Priority        | Action                                  |
| --------------- | --------------------------------------- |
| [!] Immediate   | {priorities[timing=immediate].action}   |
| [→] This Sprint | {priorities[timing=this_sprint].action} |
```

## Delta Format

| Value | Display                      |
| ----- | ---------------------------- |
| 0     | `-`                          |
| +N    | `+N` (warn if Critical/High) |
| -N    | `-N`                         |

## First Recording

If no previous snapshot exists, display Delta as `(first)` for all rows.
