# Spec Generation

## Input

Auto-detect latest SOW from workspace for consistency.

## Required Sections

| Section                     | Purpose               | ID Format |
| --------------------------- | --------------------- | --------- |
| Functional Requirements     | What to implement     | FR-001    |
| Data Model                  | TypeScript interfaces | -         |
| Implementation Details      | Phase specifics       | -         |
| Test Scenarios              | Given-When-Then       | T-001     |
| Non-Functional Requirements | Performance, Security | NFR-001   |
| Dependencies                | External/internal     | -         |
| Implementation Checklist    | By phase              | -         |

## Traceability

```text
FR-001  Implements: AC-001
T-001   Validates: FR-001
NFR-001 Validates: AC-002
```

## Confidence Markers

| Marker | Meaning   | Evidence            |
| ------ | --------- | ------------------- |
| [✓]    | Verified  | file:line           |
| [→]    | Inferred  | Reasoning stated    |
| [?]    | Uncertain | Needs investigation |

## Component API (Frontend Only)

If UI-related, include: Props table, variants, states, usage examples.

## Output

```text
Save to: .claude/workspace/planning/[same-dir]/spec.md
```

## Template

Structure: `~/.claude/templates/spec/template.md`

- Copy: Section structure, ID naming
- Do NOT copy: Actual content
