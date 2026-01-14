---
name: formatting-audits
description: Design document review format with 100-point scoring system for SOW/Spec.
allowed-tools: [Read, Grep, Glob]
user-invocable: false
---

# Review Format - Design Document Scoring

100-point scoring for SOW/Spec document quality evaluation.

## Scoring System

| Item          | Score | Focus               | Criteria                      |
| ------------- | ----- | ------------------- | ----------------------------- |
| Accuracy      | 0-25  | Facts vs inferences | ✓/→/? markers, evidence paths |
| Completeness  | 0-25  | Coverage            | Testable criteria, risks      |
| Relevance     | 0-25  | Alignment           | Goals ↔ solutions, YAGNI      |
| Actionability | 0-25  | Implementability    | Specific steps, feasibility   |

## Judgment Criteria

| Score  | Judgment    | Action                |
| ------ | ----------- | --------------------- |
| 90-100 | PASS        | Proceed to next phase |
| 70-89  | CONDITIONAL | Re-review after fixes |
| 0-69   | FAIL        | Major revision needed |

## Output Format

```markdown
## 📋 Review Result

### Total Score: {total}/100 {✅/⚠️/❌}

| Item          | Score | Marker |
| ------------- | ----- | ------ |
| Accuracy      | /25   | ✓/→/?  |
| Completeness  | /25   | ✓/→/?  |
| Relevance     | /25   | ✓/→/?  |
| Actionability | /25   | ✓/→/?  |

### Next Action

✅ PASS: /code
⚠️ CONDITIONAL: Fix and re-review
❌ FAIL: Re-plan with /think
```
