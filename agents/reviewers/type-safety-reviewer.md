---
name: type-safety-reviewer
description: TypeScript type safety review. Identifies any usage, type coverage gaps, strict mode compliance.
tools: [Read, Grep, Glob, LS]
model: opus
skills: [reviewing-type-safety, applying-code-principles]
context: fork
memory: project
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

| Error           | Action                   |
| --------------- | ------------------------ |
| No TS found     | Report "No TS to review" |
| No issues found | Return empty findings    |

## Output

Return structured YAML (base schema: `templates/audit/finding-schema.yaml`):

```yaml
findings:
  - finding_id: "TS-{seq}"
    agent: type-safety-reviewer
    severity: high|medium|low
    category: "TS1-TS5"
    location: "<file>:<line>"
    evidence: "<code snippet>"
    reasoning: "<why this is unsafe>"
    fix: "<type-safe alternative>"
    confidence: 0.70-1.00
    verification_hint:
      check: call_site_check|pattern_search
      question: "<are problematic values actually passed at call sites?>"
summary:
  total_findings: <count>
  type_coverage: "<percentage>"
  any_count: <count>
  strict_mode:
    strictNullChecks: true|false
    noImplicitAny: true|false
  files_reviewed: <count>
```
