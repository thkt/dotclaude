# Spec Generation Workflow

Implementation specification creation with traceability to SOW.

## Input Detection

```bash
# Auto-detect latest SOW
ls -t .claude/workspace/planning/*/sow.md 2>/dev/null | head -1
```

If SOW found, reference it for consistency.

## Required Sections

| Section                     | Purpose               | ID Format |
| --------------------------- | --------------------- | --------- |
| Functional Requirements     | What to implement     | FR-001    |
| Data Model                  | TypeScript interfaces | -         |
| Implementation Details      | Phase specifics       | -         |
| Test Scenarios              | Given-When-Then       | T-001     |
| Non-Functional Requirements | Performance, Security | NFR-001   |
| Dependencies                | External/internal     | -         |
| Known Issues                | From SOW              | -         |
| Implementation Checklist    | By phase              | -         |

## Traceability

Link all elements to SOW Acceptance Criteria:

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

Auto-detect frontend features:

```text
Keywords: component, UI, button, form, modal...
Exclude: api endpoint, database, CLI, backend...
```

If detected, include:

- Props table
- Variants
- States
- Usage examples

## Output

```text
Save to: .claude/workspace/planning/[same-dir]/spec.md

✅ Spec saved to: .claude/workspace/planning/[path]/spec.md
   Based on: sow.md
```

## Template

Structure reference: `~/.claude/templates/spec/template.md`

- ✅ Copy: Section structure, ID naming
- ❌ Do NOT copy: Actual content

## Related

- SOW generation: [@./sow-generation.md](./sow-generation.md)
- Validation: [@./validation-criteria.md](./validation-criteria.md)
