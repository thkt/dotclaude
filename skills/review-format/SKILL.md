---
name: review-format
description: >
  Design document review format definition with 100-point scoring system.
  Provides quality evaluation criteria, scoring items, and pass/fail logic for SOW/Spec documents.
  Combined with confidence markers (✓/→/?) to clarify evaluation evidence.
  Triggers on keywords: "SOW review", "Spec review", "document review",
  "design review", "90 points", "scoring", "grading".
---

# Review Format - Design Document Scoring

Format definition for evaluating SOW/Spec document quality with 100-point scoring.

## Purpose

- Objectively evaluate design document quality (sow.md, spec.md)
- Quality gate through 90-point pass/fail threshold
- Clarify evaluation evidence with confidence markers (✓/→/?)

## Scoring System

### Scoring Items (25 points each, 100 total)

```yaml
scoring:
  accuracy:       # Accuracy score (0-25 points)
    description: "Distinction between facts and inferences, clarity of evidence"
    criteria:
      - Confidence markers (✓/→/?) are appropriately used
      - Specific evidence such as file paths and line numbers are provided
      - Reasoning is clearly stated for inferences

  completeness:   # Completeness score (0-25 points)
    description: "Coverage of required information, absence of omissions"
    criteria:
      - Acceptance criteria are specific and testable
      - Risks and mitigations are enumerated
      - Dependencies are clearly documented

  relevance:      # Relevance score (0-25 points)
    description: "Alignment with objectives, appropriateness of scope"
    criteria:
      - Goals and solutions are aligned
      - Scope is clear without excess or deficiency
      - No unnecessary features included (YAGNI)

  actionability:  # Actionability score (0-25 points)
    description: "Concrete enough for implementation, clarity of next actions"
    criteria:
      - Implementation steps are specific
      - Technical feasibility is verified
      - Next actions are clear

total: 100 points
pass_threshold: 90 points
# Rationale: 90 points ensures all 4 scoring items achieve at least
# "18-22" range (acceptable level), preventing weak areas from being
# masked by strong areas. Lower thresholds risk proceeding with
# incomplete or low-quality specifications.
```

### Judgment Criteria

| Score | Judgment | Action |
|-------|----------|--------|
| 90-100 | ✅ PASS | Proceed to next phase |
| 70-89  | ⚠️ CONDITIONAL | Re-review after fixing issues |
| 0-69   | ❌ FAIL | Major revision needed |

## Output Format

### Review Result Template

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📋 Design Document Review Result

### Target Documents
- SOW: `{sow_path}`
- Spec: `{spec_path}`

### Total Score: {total}/100 {judgment_icon}

| Item | Score | Evaluation |
|------|-------|------------|
| Accuracy | {accuracy}/25 | {✓/→/?} |
| Completeness | {completeness}/25 | {✓/→/?} |
| Relevance | {relevance}/25 | {✓/→/?} |
| Actionability | {actionability}/25 | {✓/→/?} |

### Judgment: {PASS/CONDITIONAL/FAIL}

---

### 📊 Detailed Evaluation

#### Accuracy: {score}/25
**Strengths**:
- [✓] {Good points with evidence}

**Areas for Improvement**:
- [→] {Points needing improvement with reason}

#### Completeness: {score}/25
**Strengths**:
- [✓] {Good points with evidence}

**Areas for Improvement**:
- [?] {Missing information}

#### Relevance: {score}/25
**Strengths**:
- [✓] {Good points with evidence}

**Areas for Improvement**:
- [→] {Scope issues}

#### Actionability: {score}/25
**Strengths**:
- [✓] {Good points with evidence}

**Areas for Improvement**:
- [?] {Implementation concerns}

---

### 🔗 SOW ↔ Spec Consistency Check

| Check Item | Status | Details |
|------------|--------|---------|
| Acceptance Criteria → Functional Requirements | {✓/→/?} | {details} |
| Risks → Mitigations | {✓/→/?} | {details} |
| Dependency Alignment | {✓/→/?} | {details} |
| Test Plan Coverage | {✓/→/?} | {details} |

---

### 📝 Requested Modifications

#### 🔴 Required Fixes (Pass Condition)
1. {Specific modification content}
2. {Specific modification content}

#### 🟡 Recommended Fixes
1. {Improvement suggestion}
2. {Improvement suggestion}

---

### Next Action

{If PASS}
✅ Can proceed to implementation phase (/code)

{If CONDITIONAL}
⚠️ Please re-review after addressing the requested modifications above

{If FAIL}
❌ Major revision of SOW/Spec is required. Please re-plan with /think

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Scoring Guidelines

### Accuracy Evaluation Criteria

| Score | Criteria |
|-------|----------|
| 23-25 | All claims have ✓ markers and concrete evidence |
| 18-22 | Most claims have evidence, but some have → or ? |
| 13-17 | Multiple areas with ambiguous evidence |
| 0-12 | Many claims without evidence |

### Completeness Evaluation Criteria

| Score | Criteria |
|-------|----------|
| 23-25 | All sections are comprehensively documented |
| 18-22 | Main sections complete, minor omissions in details |
| 13-17 | Important sections have gaps |
| 0-12 | Required sections significantly lacking |

### Relevance Evaluation Criteria

| Score | Criteria |
|-------|----------|
| 23-25 | Goals and solutions fully aligned, appropriate scope |
| 18-22 | Generally aligned, minor scope excess or deficiency |
| 13-17 | Partial misalignment, scope issues present |
| 0-12 | Large gap between goals and solutions |

### Actionability Evaluation Criteria

| Score | Criteria |
|-------|----------|
| 23-25 | Specific enough to start implementation immediately |
| 18-22 | Most parts implementable, some require confirmation |
| 13-17 | Additional investigation needed before implementation |
| 0-12 | Difficult to implement, significant detail needed |

## SOW ↔ Spec Consistency Checklist

### Required Check Items

1. **Acceptance Criteria → Functional Requirements Mapping**
   - Each acceptance criterion in SOW maps to FR-xxx in Spec
   - No mapping gaps

2. **Risks → Mitigations Correspondence**
   - Risks identified in SOW are addressed in Spec
   - Any newly identified risks

3. **Dependency Alignment**
   - SOW dependencies match Spec dependency section
   - No additional dependencies introduced

4. **Test Plan Coverage**
   - SOW acceptance criteria covered by Spec test scenarios
   - Test priorities are appropriate

## Usage

### Reference from Agents

```yaml
# agents/reviewers/sow-spec.md
skills:
  - review-format
  - readability-review
  - code-principles
```

### Direct Invocation

Auto-triggers on keywords "SOW review", "design review", "90-point threshold", etc.

## Related Documents

- [@~/.claude/agents/reviewers/sow-spec.md] - SOW/Spec specialized reviewer
- [@~/.claude/commands/think.md] - SOW/Spec generation command
- [@~/.claude/skills/readability-review/SKILL.md] - Readability evaluation criteria

---

**Version History**

- **1.0.0** (2025-12-08): Initial release - 100-point scoring + confidence marker integration
