---
name: formatting-audits
description: >
  Design document review format definition with 100-point scoring system.
  Provides quality evaluation criteria, scoring items, and pass/fail logic for SOW/Spec documents.
  Combined with confidence markers (✓/→/?) to clarify evaluation evidence.
  Triggers: SOW review, Spec review, document review, design review,
  ドキュメントレビュー, 設計レビュー, 90 points, scoring, grading,
  品質評価, スコアリング, 合否判定.
allowed-tools: Read, Grep, Glob
---

# Review Format - Design Document Scoring

100-point scoring format for evaluating SOW/Spec document quality.

## Scoring System

| Item | Score | Focus | Criteria |
| --- | --- | --- | --- |
| Accuracy | 0-25 | Facts vs inferences | ✓/→/? markers, evidence paths |
| Completeness | 0-25 | Coverage | Testable criteria, risks, dependencies |
| Relevance | 0-25 | Alignment | Goals ↔ solutions, scope, YAGNI |
| Actionability | 0-25 | Implementability | Specific steps, feasibility, next actions |

## Judgment Criteria

| Score | Judgment | Action |
| --- | --- | --- |
| 90-100 | ✅ PASS | Proceed to next phase |
| 70-89 | ⚠️ CONDITIONAL | Re-review after fixes |
| 0-69 | ❌ FAIL | Major revision needed |

## Score Guidelines

| Score Range | Quality Level |
| --- | --- |
| 23-25 | Excellent - All claims have evidence |
| 18-22 | Acceptable - Most claims verified |
| 13-17 | Needs work - Multiple gaps |
| 0-12 | Insufficient - Major issues |

## Output Format

```markdown
## 📋 Design Document Review Result

### Total Score: {total}/100 {✅/⚠️/❌}

| Item | Score | Marker |
|------|-------|--------|
| Accuracy | /25 | ✓/→/? |
| Completeness | /25 | ✓/→/? |
| Relevance | /25 | ✓/→/? |
| Actionability | /25 | ✓/→/? |

### 🔗 SOW ↔ Spec Consistency
| Check | Status |
|-------|--------|
| Acceptance Criteria → FR | ✓/→/? |
| Risks → Mitigations | ✓/→/? |
| Dependencies | ✓/→/? |
| Test Coverage | ✓/→/? |

### 📝 Requested Modifications
🔴 Required: [list]
🟡 Recommended: [list]

### Next Action
✅ PASS: /code
⚠️ CONDITIONAL: Fix and re-review
❌ FAIL: Re-plan with /think
```

## References

### Related Skills

- `reviewing-readability` - Readability review skill

### Related Agents

- `sow-spec-reviewer` - SOW/Spec verification agent

### Used by Commands

- `/think` - SOW/Spec generation
- `/audit` - Code review orchestration
