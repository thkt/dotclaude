---
type: sow
version: 1.0.0
status: draft
created: [YYYY-MM-DD]
confidence:
  overall: [0.0-1.0]
  verified: [count]
  inferred: [count]
  uncertain: [count]
---

# SOW: [Feature Name]

## Executive Summary

[C: 0.7] [1-2 sentence overview]

**Scope**: [Key areas: area1, area2, area3]

---

## Problem Analysis

### Current State

| Metric   | Value   | Issue   | Confidence |
| -------- | ------- | ------- | ---------- |
| [metric] | [value] | [issue] | [C: X.X]   |

Evidence: [source]

### Issues

| ID    | Description | Confidence | Evidence              |
| ----- | ----------- | ---------- | --------------------- |
| I-001 | [issue]     | [C: 0.9]   | [file:line or source] |
| I-002 | [issue]     | [C: 0.7]   | [inference basis]     |
| I-003 | [issue]     | [C: 0.5]   | [needs investigation] |

---

## Assumptions

| ID    | Type       | Description          | Confidence |
| ----- | ---------- | -------------------- | ---------- |
| A-001 | fact       | [verified fact]      | [C: 0.95]  |
| A-002 | assumption | [working assumption] | [C: 0.7]   |
| A-003 | unknown    | [needs verification] | [C: 0.4]   |

---

## Solution Design

### Approach

| Phase | Description  | Confidence |
| ----- | ------------ | ---------- |
| 1     | [quick wins] | [C: X.X]   |
| 2     | [structural] | [C: X.X]   |
| 3     | [long-term]  | [C: X.X]   |

### Alternatives

| Option | Pros   | Cons   | Confidence | Decision  |
| ------ | ------ | ------ | ---------- | --------- |
| A      | [pros] | [cons] | [C: X.X]   | **ADOPT** |
| B      | [pros] | [cons] | [C: X.X]   | REJECT    |

---

## Acceptance Criteria

| ID     | Description | Confidence | Validates    |
| ------ | ----------- | ---------- | ------------ |
| AC-001 | [criterion] | [C: 0.9]   | I-001        |
| AC-002 | [criterion] | [C: 0.7]   | I-002, A-002 |
| AC-003 | [criterion] | [C: 0.5]   | I-003        |

---

## Test Plan

| Priority | Type        | Description | Validates      |
| -------- | ----------- | ----------- | -------------- |
| HIGH     | unit        | [test]      | AC-001         |
| MEDIUM   | integration | [test]      | AC-001, AC-002 |
| LOW      | e2e         | [test]      | AC-003         |

---

## Implementation Plan

### Progress Matrix

| Feature   | spec | design | impl | test | review | Progress |
| --------- | :--: | :----: | :--: | :--: | :----: | :------: |
| [feature] |  ⬜  |   ⬜   |  ⬜  |  ⬜  |   ⬜   |    0%    |

Legend: ⬜=0% | 🔄=25% | 📝=50% | 👀=75% | ✅=100%

### Phases

| Phase | Steps          | Validates |
| ----- | -------------- | --------- |
| 1     | [step1, step2] | AC-001    |
| 2     | [step1, step2] | AC-002    |

---

## Success Metrics

| Metric   | Target   | Confidence | Validates |
| -------- | -------- | ---------- | --------- |
| [metric] | [target] | [C: X.X]   | AC-001    |

---

## Risks

| ID    | Risk   | Impact | Mitigation   | Confidence |
| ----- | ------ | ------ | ------------ | ---------- |
| R-001 | [risk] | HIGH   | [mitigation] | [C: 0.9]   |
| R-002 | [risk] | MEDIUM | [mitigation] | [C: 0.7]   |
| R-003 | [risk] | LOW    | [monitor]    | [C: 0.5]   |

---

## Verification Checklist

| Check          | Status | Confidence |
| -------------- | ------ | ---------- |
| [prerequisite] | [ ]    | [C: X.X]   |

---

## References

| Type     | Path   |
| -------- | ------ |
| research | [path] |
| related  | [path] |

---

## Implementation Records

IDR: `./idr.md`
Status: [ ] Not Started | [ ] In Progress | [ ] Complete

| Phase     | Date | Confidence |
| --------- | ---- | ---------- |
| /code     | -    | -          |
| /audit    | -    | -          |
| /polish   | -    | -          |
| /validate | -    | -          |
