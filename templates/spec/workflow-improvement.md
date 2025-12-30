---
type: spec
version: 1.0.0
based_on: sow v1.0.0
updated: [YYYY-MM-DD]
confidence:
  overall: [0.0-1.0]
traceability:
  sow: [path]
  fr_count: [count]
  nfr_count: [count]
---

# Spec: [Feature Name]

## 1. Functional Requirements

| ID | Description | Input | Output | Confidence | Implements |
| --- | --- | --- | --- | --- | --- |
| FR-001 | [requirement] | [input] | [output] | [C: 0.9] | AC-001 |
| FR-002 | [requirement] | [input] | [output] | [C: 0.7] | AC-002 |

### Validation Rules

| FR | Rule | Error |
| --- | --- | --- |
| FR-001 | [validation] | [error message] |

---

## 2. Data Model

```typescript
interface [ModelName] {
  [property]: [type];  // [FR-001]
}
```

### Schema Mapping

| Model | Fields | Used By |
| --- | --- | --- |
| [Model] | [fields] | FR-001, FR-002 |

---

## 3. Implementation

### Phase Mapping

| Phase | FRs | Files | Confidence |
| --- | --- | --- | --- |
| 1 | FR-001 | [files] | [C: X.X] |
| 2 | FR-002 | [files] | [C: X.X] |

### Commands

| Phase | Command | Purpose |
| --- | --- | --- |
| 1 | [command] | [purpose] |

---

## 4. Test Scenarios

| ID | Type | FR | Given | When | Then | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-001 | unit | FR-001 | [precondition] | [action] | [result] | [C: 0.9] |
| T-002 | integration | FR-001,002 | [precondition] | [action] | [result] | [C: 0.7] |

---

## 5. Non-Functional Requirements

| ID | Category | Requirement | Target | Confidence | Validates |
| --- | --- | --- | --- | --- | --- |
| NFR-001 | performance | [requirement] | [target] | [C: 0.7] | AC-001 |
| NFR-002 | maintainability | [requirement] | [target] | [C: 0.7] | AC-002 |
| NFR-003 | compatibility | [requirement] | [target] | [C: 0.9] | AC-003 |

---

## 6. Dependencies

| Type | Name | Purpose | Used By |
| --- | --- | --- | --- |
| external | [lib] | [purpose] | FR-001 |
| internal | [service] | [purpose] | FR-002 |

---

## 7. Assumptions & Unknowns

| ID | Type | Description | Confidence | Impact |
| --- | --- | --- | --- | --- |
| SA-001 | assumption | [assumption] | [C: 0.7] | FR-001 |
| SA-002 | unknown | [unknown] | [C: 0.4] | FR-002 |

---

## 8. Implementation Checklist

| Phase | Task | FR | Status |
| --- | --- | --- | --- |
| 1 | [task] | FR-001 | [ ] |
| 2 | [task] | FR-002 | [ ] |

---

## 9. Migration Guide

| Change | Before | After | Impact |
| --- | --- | --- | --- |
| [feature] | [old] | [new] | [compatibility] |

---

## 10. Traceability Matrix

| SOW AC | Spec FR | Test | NFR |
| --- | --- | --- | --- |
| AC-001 | FR-001 | T-001 | NFR-001 |
| AC-002 | FR-002 | T-002 | NFR-002 |
