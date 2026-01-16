---
name: formatting-audits
description: Design document review format with 100-point scoring system for SOW/Spec.
allowed-tools: [Read, Grep, Glob]
agent: sow-spec-reviewer
user-invocable: false
---

# SOW/Spec Scoring (100-point)

## Scoring

| Category      | Score | Focus                       |
| ------------- | ----- | --------------------------- |
| Accuracy      | 0-25  | ✓/→/? markers, evidence     |
| Completeness  | 0-25  | All sections, testable AC   |
| Relevance     | 0-25  | Goals ↔ solutions, no YAGNI |
| Actionability | 0-25  | Specific steps, feasibility |

## Deductions

| Issue                    | Points |
| ------------------------ | ------ |
| No confidence marker     | -5     |
| Missing required section | -10    |
| AC without test scenario | -5     |
| Vague action item        | -5     |
| YAGNI violation          | -5     |
| Inconsistent AC-FR map   | -10    |

## Thresholds

| Score  | Judgment    | Action                |
| ------ | ----------- | --------------------- |
| 90-100 | PASS        | Proceed to next phase |
| 70-89  | CONDITIONAL | Re-review after fixes |
| 0-69   | FAIL        | Major revision needed |
