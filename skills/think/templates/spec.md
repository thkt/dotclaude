# Spec: [Feature Name]

Updated: [YYYY-MM-DD]
Session: [session-id]
SOW: [path to sow.md]

## Functional Requirements

| ID     | Description                | Input            | Output            | Implements | Testability Notes                |
| ------ | -------------------------- | ---------------- | ----------------- | ---------- | -------------------------------- |
| FR-001 | The system SHALL [action]. | [semantic input] | [semantic output] | AC-001     | [e.g. mock clock, pure fn, none] |

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

### Validation

| ID     | Description                                       | Error kind               |
| ------ | ------------------------------------------------- | ------------------------ |
| FR-002 | If [condition], then the system SHALL [response]. | [kind + info to include] |

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

| Phase | FRs    | Files   | Depends |
| ----- | ------ | ------- | ------- |
| 1     | FR-001 | [files] | none    |

Depends: list prior Phase IDs this phase requires, or `none` for parallel-executable. Enables agents to schedule independent phases concurrently.

## Test Scenarios

| ID    | Type        | FR     | Given          | When     | Then     |
| ----- | ----------- | ------ | -------------- | -------- | -------- |
| T-001 | unit        | FR-001 | [precondition] | [action] | [result] |
| T-002 | integration | FR-001 | [precondition] | [action] | [result] |
| T-003 | e2e         | FR-001 | [precondition] | [action] | [result] |

## Non-Functional Requirements

| ID      | Category    | Requirement   | Target   | Rationale   | Validates |
| ------- | ----------- | ------------- | -------- | ----------- | --------- |
| NFR-001 | performance | [requirement] | [target] | [why target] | AC-001   |

Rationale: why this target value (e.g. "UX guideline", "SLA 99.9%", "P95 budget of parent request"). Empty = reviewers cannot judge whether the threshold is appropriate.

## Assumptions

| ID     | Assumption   | Rationale   | Impact if broken |
| ------ | ------------ | ----------- | ---------------- |
| AS-001 | [assumption] | [why held]  | [what collapses] |

Assumption: preconditions taken as given (existing infra, data shape, external SLA). Impact if broken: what must be redesigned if the assumption fails. Forces the reviewer to confront hidden coupling.

## Dependencies

| Type     | Name  | Purpose   | Used By |
| -------- | ----- | --------- | ------- |
| external | [lib] | [purpose] | FR-001  |

## Traceability Matrix

| AC     | FR     | Test  | NFR     |
| ------ | ------ | ----- | ------- |
| AC-001 | FR-001 | T-001 | NFR-001 |
