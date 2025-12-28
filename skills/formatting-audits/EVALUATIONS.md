# Evaluations for formatting-audits

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: SOW review, Spec review, document review, design review, 90 points, scoring, grading, レビュー, 評価, 採点, 品質チェック
- **Contexts**: SOW/Spec quality evaluation, /validate command, design document assessment

## Evaluation Scenarios

### Scenario 1: SOW Quality Scoring

```json
{
  "skills": ["formatting-audits"],
  "query": "このSOWドキュメントの品質を評価して",
  "files": [".claude/workspace/planning/sow.md"],
  "expected_behavior": [
    "Skill is triggered by 'SOW' and '評価'",
    "Applies 100-point scoring system",
    "Evaluates: Accuracy(25), Completeness(25), Clarity(25), Actionability(25)",
    "Uses confidence markers (✓/→/?)",
    "Shows pass/fail against 90-point threshold"
  ]
}
```

### Scenario 2: Spec Document Review

```json
{
  "skills": ["formatting-audits"],
  "query": "spec.mdの完全性をチェックして",
  "files": [".claude/workspace/planning/spec.md"],
  "expected_behavior": [
    "Skill is triggered by 'spec' and 'チェック'",
    "Checks completeness criteria",
    "Verifies acceptance criteria are testable",
    "Checks risks and mitigations are documented",
    "Evaluates dependencies clarity"
  ]
}
```

### Scenario 3: Accuracy Evaluation

```json
{
  "skills": ["formatting-audits"],
  "query": "このドキュメントの正確性を検証したい",
  "files": [".claude/workspace/planning/sow.md"],
  "expected_behavior": [
    "Skill is triggered by '正確性'",
    "Checks confidence markers usage",
    "Verifies evidence (file paths, line numbers)",
    "Identifies claims without evidence",
    "Distinguishes facts (✓) from inferences (→)"
  ]
}
```

### Scenario 4: Pass/Fail Judgment

```json
{
  "skills": ["formatting-audits"],
  "query": "/validate でSOWの合格判定をして",
  "files": [".claude/workspace/planning/sow.md"],
  "expected_behavior": [
    "Skill is triggered by '/validate' and 'SOW'",
    "Calculates total score (0-100)",
    "Applies 90-point pass threshold",
    "Lists specific improvement items if failing",
    "Provides actionable feedback"
  ]
}
```

### Scenario 5: Multi-Document Review

```json
{
  "skills": ["formatting-audits"],
  "query": "SOWとSpecの整合性を確認して",
  "files": [".claude/workspace/planning/sow.md", ".claude/workspace/planning/spec.md"],
  "expected_behavior": [
    "Skill is triggered by 'SOW' and 'Spec' and '整合性'",
    "Cross-references both documents",
    "Checks requirement coverage",
    "Identifies gaps between SOW and Spec",
    "Verifies traceability"
  ]
}
```

## Scoring Criteria Reference

| Category | Max Points | Key Checks |
| --- | --- | --- |
| Accuracy | 25 | Confidence markers, evidence, fact/inference distinction |
| Completeness | 25 | Acceptance criteria, risks, dependencies |
| Clarity | 25 | Readability, unambiguous language, structure |
| Actionability | 25 | Concrete tasks, measurable outcomes, timeline |

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by review keywords
- [ ] 100-point scoring system was applied
- [ ] Confidence markers (✓/→/?) were used
- [ ] 90-point pass threshold was referenced
- [ ] Specific improvement items were listed
- [ ] Actionable feedback was provided

## Baseline Comparison

### Without Skill

- Subjective document review
- No scoring system
- Inconsistent evaluation criteria
- Missing confidence markers

### With Skill

- Objective 100-point scoring
- Structured 4-category evaluation
- 90-point quality gate
- Evidence-based assessment with markers
- Actionable improvement feedback
