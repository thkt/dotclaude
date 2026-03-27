# Spec: [Feature Name]

Updated: [YYYY-MM-DD]
SOW: [path to sow.md]

## Functional Requirements

| ID     | Description   | Input            | Output            | Implements |
| ------ | ------------- | ---------------- | ----------------- | ---------- |
| FR-001 | [requirement] | [semantic input] | [semantic output] | AC-001     |

Input/Output: semantic descriptions (what goes in/out), not type names or field names.

Description: EARS (Easy Approach to Requirements Syntax) pattern required.

| Pattern | Syntax                                                 | Use when               |
| ------- | ------------------------------------------------------ | ---------------------- |
| Always  | The system SHALL [action]                              | Unconditional behavior |
| Event   | When [event], the system SHALL [action]                | Response to a trigger  |
| State   | While [state], the system SHALL [action]               | During a condition     |
| Error   | If [condition], then the system SHALL [action]         | Failure handling       |
| Limit   | The system SHALL NOT [action]                          | Prohibited behavior    |
| Complex | While [state], when [event], the system SHALL [action] | State + trigger combo  |

Rules: one SHALL per sentence, concrete values (no "appropriate" / "suitable" / "properly" / "correctly"), each SHALL specifies a numeric threshold, named state/error, or concrete input-output pair.

Validation:

| FR     | Rule         | Error kind               |
| ------ | ------------ | ------------------------ |
| FR-001 | [validation] | [kind + info to include] |

## Domain Model

<!-- Concept-level only. No type names, field names, or language-specific syntax. Precise type definitions belong in Phase 1 implementation. -->

### Entities

| Entity   | Attributes            | Invariants            | FR     |
| -------- | --------------------- | --------------------- | ------ |
| [Entity] | [semantic attributes] | [what must hold true] | FR-001 |

Attributes: semantic descriptions ("list of authors", "optional thread origin"). Field names and types are implementation decisions.

<!-- Add Business Rules, Domain Events only when applicable -->

### Business Rules

| ID     | Rule   | Description   | Enforced By | FR     |
| ------ | ------ | ------------- | ----------- | ------ |
| BR-001 | [rule] | [description] | [component] | FR-001 |

### Domain Events

| Event   | Trigger   | Consumers   | FR     |
| ------- | --------- | ----------- | ------ |
| [event] | [trigger] | [consumers] | FR-001 |

<!-- Implementation and Dependencies are optional. Omit if single-phase or no external deps -->

## Implementation

| Phase | FRs    | Files   |
| ----- | ------ | ------- |
| 1     | FR-001 | [files] |

## Test Scenarios

| ID    | Type        | FR     | Given          | When     | Then     |
| ----- | ----------- | ------ | -------------- | -------- | -------- |
| T-001 | unit        | FR-001 | [precondition] | [action] | [result] |
| T-002 | integration | FR-001 | [precondition] | [action] | [result] |
| T-003 | e2e         | FR-001 | [precondition] | [action] | [result] |

## Non-Functional Requirements

| ID      | Category    | Requirement   | Target   | Validates |
| ------- | ----------- | ------------- | -------- | --------- |
| NFR-001 | performance | [requirement] | [target] | AC-001    |

## Dependencies

| Type     | Name  | Purpose   | Used By |
| -------- | ----- | --------- | ------- |
| external | [lib] | [purpose] | FR-001  |

## Implementation Checklist

- [ ] Phase 1: [task](FR-001)
- [ ] Phase 2: [task](FR-002)

## Traceability Matrix

| AC     | FR     | Test  | NFR     |
| ------ | ------ | ----- | ------- |
| AC-001 | FR-001 | T-001 | NFR-001 |
