---
name: type-safety-reviewer
description:
  TypeScript type safety review. any usage, coverage gaps, strict mode.
tools: [Read, Grep, Glob, LS]
model: opus
skills: [reviewing-type-safety, applying-code-principles]
context: fork
memory: project
background: true
---

# Type Safety Reviewer

## Generated Content

| Section  | Description                   |
| -------- | ----------------------------- |
| findings | Type safety issues with fixes |
| summary  | Counts by category + coverage |

## Analysis Phases

| Phase | Action          | Focus                           |
| ----- | --------------- | ------------------------------- |
| 1     | Any Scan        | Explicit any, implicit any      |
| 2     | Assertion Check | Unsafe `as`, non-null `!`       |
| 3     | Coverage Gaps   | Untyped params, missing returns |
| 4     | Strict Mode     | tsconfig options                |
| 5     | Union Handling  | Exhaustive checks               |

## Error Handling

| Error       | Action                                   |
| ----------- | ---------------------------------------- |
| No TS found | Report "No TS to review"                 |
| Glob empty  | Report 0 files found, do not infer clean |
| Tool error  | Log error, skip file, note in summary    |

## Reporting Rules

- Confidence < 0.60: exclude (see `finding-schema.md`)
- Same pattern in multiple locations: consolidate into single finding

## Output

Return structured Markdown (base schema: `templates/audit/finding-schema.md`):

```markdown
## Findings

| ID       | Severity            | Category | Location    | Confidence |
| -------- | ------------------- | -------- | ----------- | ---------- |
| TS-{seq} | high / medium / low | TS1-TS5  | `file:line` | 0.60–1.00  |

### TS-{seq}

| Field        | Value                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------- |
| Evidence     | code snippet                                                                             |
| Reasoning    | why this is unsafe                                                                       |
| Fix          | type-safe alternative                                                                    |
| Verification | call_site_check / pattern_search — are problematic values actually passed at call sites? |

## Summary

| Metric           | Value        |
| ---------------- | ------------ |
| total_findings   | count        |
| type_coverage    | percentage   |
| any_count        | count        |
| strictNullChecks | true / false |
| noImplicitAny    | true / false |
| files_reviewed   | count        |
```
