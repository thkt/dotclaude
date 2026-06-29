# Spec Template

The template /think generates from the SOW in the SOW / Spec Generation phase.

## Template

Replace `{...}` with the SOW and design context and fill `${CLAUDE_SESSION_ID}` into `Session`. Omit any section marked optional or applicable-only, heading and all, when there is nothing to write.

```markdown
# Spec: {Feature Name}

Updated: {YYYY-MM-DD}
Session: {session-id}
SOW: {path to sow.md}

## Functional Requirements

<!-- Semantic descriptions of what goes in and out, not type names or field names. -->

| ID     | Description                | Input            | Output            | Implements | Testability Notes                |
| ------ | -------------------------- | ---------------- | ----------------- | ---------- | -------------------------------- |
| FR-001 | The system SHALL {action}. | {semantic input} | {semantic output} | AC-001     | {e.g. mock clock, pure fn, none} |

<!-- EARS (Easy Approach to Requirements Syntax) pattern required. -->
<!-- One SHALL per sentence, concrete values (no "appropriate" / "suitable" / "properly" / "correctly"), each SHALL specifies a numeric threshold, named state/error, or concrete input-output pair. -->

| Pattern | Syntax                                                 | Use when               |
| ------- | ------------------------------------------------------ | ---------------------- |
| Always  | The system SHALL [action]                              | Unconditional behavior |
| Event   | When [event], the system SHALL [action]                | Response to a trigger  |
| State   | While [state], the system SHALL [action]               | During a condition     |
| Error   | If [condition], then the system SHALL [action]         | Failure handling       |
| Limit   | The system SHALL NOT [action]                          | Prohibited behavior    |
| Complex | While [state], when [event], the system SHALL [action] | State + trigger combo  |

### Validation

| ID     | Description                                       | Error kind               |
| ------ | ------------------------------------------------- | ------------------------ |
| FR-002 | If {condition}, then the system SHALL {response}. | {kind + info to include} |

## Domain Model

<!-- Concept-level only. No type names, field names, or language-specific syntax. Precise type definitions belong in Phase 1 implementation. -->

### Entities

<!-- Semantic descriptions ("list of authors", "optional thread origin"). Field names and types are implementation decisions. -->

| Entity   | Attributes            | Invariants            | FR     |
| -------- | --------------------- | --------------------- | ------ |
| {Entity} | {semantic attributes} | {what must hold true} | FR-001 |

<!-- Add Business Rules, Domain Events only when applicable -->

### Business Rules

| ID     | Rule   | Description   | Enforced By | FR     |
| ------ | ------ | ------------- | ----------- | ------ |
| BR-001 | {rule} | {description} | {component} | FR-001 |

### Domain Events

| Event   | Trigger   | Consumers   | FR     |
| ------- | --------- | ----------- | ------ |
| {event} | {trigger} | {consumers} | FR-001 |

<!-- Implementation and Dependencies are optional. Omit if single-phase or no external deps -->

## Implementation

<!-- Prior Phase IDs this phase requires, or `none` for parallel-executable. -->

| Phase | FRs    | Files   | Depends |
| ----- | ------ | ------- | ------- |
| 1     | FR-001 | {files} | none    |

## Frontend Design

<!-- Only when the work involves UI. Omit for CLI / backend-only. -->

| Concern                | Decision                                            |
| ---------------------- | --------------------------------------------------- |
| Component Architecture | {hierarchy, boundaries, responsibilities}           |
| State Strategy         | {server state vs client state, management approach} |
| Operational Concerns   | {error boundaries, logging, loading states}         |

## Testing Decisions

<!-- Strategy-level. Concrete scenarios go in Test Scenarios below. -->

| Decision             | Value                                                    |
| -------------------- | -------------------------------------------------------- |
| Definition of "good" | {external behavior only, not implementation details}     |
| Modules under test   | {which modules / components / pure functions}            |
| Mock boundary        | {what is real, what is mocked, why}                      |
| Prior art            | {link or filename for the closest existing test, if any} |
| Skip rationale       | {if some FRs intentionally have no T-NNN, state why}     |

## Test Scenarios

| ID    | Type        | FR     | Given          | When     | Then     |
| ----- | ----------- | ------ | -------------- | -------- | -------- |
| T-001 | unit        | FR-001 | {precondition} | {action} | {result} |
| T-002 | integration | FR-001 | {precondition} | {action} | {result} |
| T-003 | e2e         | FR-001 | {precondition} | {action} | {result} |

## Non-Functional Requirements

<!-- Why this target value (e.g. "UX guideline", "SLA 99.9%", "P95 budget of parent request"). Empty = reviewers cannot judge whether the threshold is appropriate. -->

| ID      | Category    | Requirement   | Target   | Rationale    | Validates |
| ------- | ----------- | ------------- | -------- | ------------ | --------- |
| NFR-001 | performance | {requirement} | {target} | {why target} | AC-001    |

## Assumptions

<!-- Preconditions taken as given (existing infra, data shape, external SLA). Impact if broken is what must be redesigned if the assumption fails. -->

| ID     | Assumption   | Rationale  | Impact if broken |
| ------ | ------------ | ---------- | ---------------- |
| AS-001 | {assumption} | {why held} | {what collapses} |

## Dependencies

| Type     | Name  | Purpose   | Used By |
| -------- | ----- | --------- | ------- |
| external | {lib} | {purpose} | FR-001  |

## Traceability Matrix

| AC     | FR     | Test  | NFR     |
| ------ | ------ | ----- | ------- |
| AC-001 | FR-001 | T-001 | NFR-001 |
```
