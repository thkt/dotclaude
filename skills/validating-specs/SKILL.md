---
name: validating-specs
description: >
  SOW/Spec cross-document consistency validation. Use when checking
  cross-document consistency, or when user mentions 整合性チェック, consistency
  check, spec validation, 仕様検証.
allowed-tools: [Read, Grep, Glob]
agent: sow-spec-reviewer
context: fork
user-invocable: false
---

# SOW/Spec Consistency Validation

## ID System

| Document | Prefix  | Links To         |
| -------- | ------- | ---------------- |
| SOW      | AC-N    | —                |
| Spec     | FR-NNN  | Implements: AC-N |
| Spec     | T-NNN   | FR: FR-NNN       |
| Spec     | NFR-NNN | Validates: AC-N  |

## Checks

Run CRITICAL (1-3) first. If any fail, run remaining but mark WARNING/INFO as
provisional.

### 1. AC→FR Traceability [CRITICAL]

Each `AC-N` must have ≥1 FR with `Implements: AC-N`. Orphan FR referencing
non-existent AC → INFO.

### 2. FR→Test Coverage [CRITICAL]

Each `FR-NNN` must have ≥1 `T-NNN` with matching FR reference.

### 3. Traceability Matrix Integrity [CRITICAL]

Matrix rows must match actual content. Flag mismatches.

| Column | Must exist in             |
| ------ | ------------------------- |
| AC     | SOW Acceptance Criteria   |
| FR     | Spec Functional Req table |
| Test   | Spec Test Scenarios       |
| NFR    | Spec NFR table            |

### 4. Scope↔Implementation [WARNING]

SOW In-Scope targets must appear in Spec phases. Extra files → INFO.

### 5. Contradiction Detection [WARNING]

Cross-check SOW↔Spec for technology mismatches, numeric conflicts,
contradictions.

### 6. Ambiguous Expressions [INFO]

| Language | Patterns                                                                           |
| -------- | ---------------------------------------------------------------------------------- |
| JA       | 適切に、できる限り、なるべく、ある程度、検討する、考慮する、予定、高速に(数値なし) |
| EN       | appropriately, as much as possible, reasonable, adequate, TBD, fast(no metric)     |

### 7. Terminology Consistency [WARNING]

Same concept must use same term across documents. Flag synonyms (user/member),
abbreviation mixing (DB/database).

### 8. YAGNI Compliance [WARNING]

With YAGNI Checklist: verify Spec excludes checked items. Without: flag
over-engineering (excess permissions, caching without NFR, unscoped
infrastructure).

## Output

Markdown appended to reviewer findings:

```markdown
## Consistency Findings

| ID      | Severity                  | Check      | Location                         | Issue       | Suggestion |
| ------- | ------------------------- | ---------- | -------------------------------- | ----------- | ---------- |
| CON-001 | CRITICAL / WARNING / INFO | check name | sow.md:section / spec.md:section | description | fix        |
```

## Score Impact

| Severity | Deduction                          |
| -------- | ---------------------------------- |
| CRITICAL | -10 per finding (from Accuracy)    |
| WARNING  | -5 per finding (from Completeness) |
| INFO     | -2 per finding (max -10 total)     |
