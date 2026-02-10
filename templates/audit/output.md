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

> Challenger が棄却したが Verifier がエビデンスを確認。人間の判断が必要。

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
