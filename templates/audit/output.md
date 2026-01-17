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

---

## Quick Fixes

| ID                                       | Location                                                                                                  | Effort                                       | Rationale                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| {suggestions.items[fix_type!=manual].id} | `{suggestions.items[fix_type!=manual].location.file}:{suggestions.items[fix_type!=manual].location.line}` | {suggestions.items[fix_type!=manual].effort} | {suggestions.items[fix_type!=manual].rationale} |

Apply: `/fix <ID>`

---

## Patterns

| Pattern           | Root Cause              |
| ----------------- | ----------------------- |
| {patterns[].name} | {patterns[].root_cause} |

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
