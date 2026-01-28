# Spec: [Feature Name]

Updated: [YYYY-MM-DD]
SOW: [path to sow.md]

## Functional Requirements

| ID     | Description   | Input   | Output   | Implements |
| ------ | ------------- | ------- | -------- | ---------- |
| FR-001 | [requirement] | [input] | [output] | AC-001     |

Validation:

| FR     | Rule         | Error           |
| ------ | ------------ | --------------- |
| FR-001 | [validation] | [error message] |

## Data Model

```typescript
interface [ModelName] {
  [property]: [type];  // FR-001
}
```

| Model   | Fields   | Used By |
| ------- | -------- | ------- |
| [Model] | [fields] | FR-001  |

## Implementation

| Phase | FRs    | Files   |
| ----- | ------ | ------- |
| 1     | FR-001 | [files] |

## Test Scenarios

| ID    | Type | FR     | Given          | When     | Then     |
| ----- | ---- | ------ | -------------- | -------- | -------- |
| T-001 | unit | FR-001 | [precondition] | [action] | [result] |

## Non-Functional Requirements

| ID      | Category    | Requirement   | Target   | Validates |
| ------- | ----------- | ------------- | -------- | --------- |
| NFR-001 | performance | [requirement] | [target] | AC-001    |

## Dependencies

| Type     | Name  | Purpose   | Used By |
| -------- | ----- | --------- | ------- |
| external | [lib] | [purpose] | FR-001  |

## Implementation Checklist

- [ ] Phase 1: [task] (FR-001)
- [ ] Phase 2: [task] (FR-002)

## Traceability Matrix

| AC     | FR     | Test  | NFR     |
| ------ | ------ | ----- | ------- |
| AC-001 | FR-001 | T-001 | NFR-001 |
