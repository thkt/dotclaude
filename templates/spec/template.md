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

## Domain Model

<!-- Omit any subsection below that doesn't apply. For simple features (CLI tools, config changes, UI tweaks), a brief Data Model table is sufficient. -->

### Data Model

```typescript
interface [ModelName] {
  [property]: [type];  // FR-001
}
```

| Model   | Fields   | Used By |
| ------- | -------- | ------- |
| [Model] | [fields] | FR-001  |

<!-- For business apps (entities >= 3 or business rules >= 3), add the subsections below. -->

### Entities

| Entity   | Attributes   | Invariants   | FR     |
| -------- | ------------ | ------------ | ------ |
| [Entity] | [attributes] | [invariants] | FR-001 |

### Business Rules

| ID     | Rule   | Description   | Enforced By | FR     |
| ------ | ------ | ------------- | ----------- | ------ |
| BR-001 | [rule] | [description] | [component] | FR-001 |

### Domain Events

| Event   | Trigger   | Consumers   | FR     |
| ------- | --------- | ----------- | ------ |
| [event] | [trigger] | [consumers] | FR-001 |

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
