---
description: Generate Specification (spec.md) with implementation-ready details
allowed-tools: Read, Write, Glob, Grep, LS
model: inherit
argument-hint: "[sow path or feature description]"
dependencies: [formatting-audits]
---

# /spec - Specification Generator

## Purpose

Generate spec.md only (single artifact) with implementation-ready details.

## Template Reference

Use for **structure and section order ONLY**:
[@~/.claude/templates/spec/workflow-improvement.md]

**IMPORTANT**:

- ✅ Copy: Section structure, ID naming (FR-001, NFR-001, T-001), table formats
- ❌ Do NOT copy: Actual content, specific values
- Generate fresh content based on SOW or feature description

## Input Detection

Auto-detect SOW if not specified:

```bash
!`ls -t .claude/workspace/planning/*/sow.md 2>/dev/null | head -1 || ls -t ~/.claude/workspace/planning/*/sow.md 2>/dev/null | head -1 || echo "(no SOW found)"`
```

If SOW found, reference it for consistency.

## Confidence Markers

Use numeric format `[C: X.X]` throughout:

| Range | Meaning | Evidence Required |
| --- | --- | --- |
| [C: 0.9+] | Verified | file:line, command output, logs |
| [C: 0.7-0.9] | Inferred | Reasoning basis stated |
| [C: <0.7] | Uncertain | Needs investigation |

## Traceability

Link all elements to SOW Acceptance Criteria:

- FR-001 `Implements: AC-001` - Functional requirement traces to AC
- T-001 `Validates: FR-001` - Test validates requirement
- NFR-001 `Validates: AC-002` - Non-functional requirement traces to AC

## Required Sections

Follow Golden Master structure:

1. **Functional Requirements** - FR-001, FR-002... with Input/Output/Validation
2. **Data Model** - TypeScript interfaces
3. **Implementation Details** - Phase-by-phase specifics
4. **Test Scenarios** - Given-When-Then format
5. **Non-Functional Requirements** - NFR-001... (Performance, Security, A11y)
6. **Dependencies** - External libraries, internal services
7. **Known Issues & Assumptions** - Carried from SOW
8. **Implementation Checklist** - By phase
9. **Migration Guide** - For existing users (if applicable)
10. **References** - Link to SOW

## Component API Section (Frontend Only)

Auto-detect frontend features:

```text
Keywords: component, UI, button, form, modal, dialog, card...
Exclude: api endpoint, database, CLI, migration, backend...
```

If frontend detected, include Component API section with:

- Props table
- Variants
- States
- Usage examples

## Output

Save to same directory as SOW:
`.claude/workspace/planning/[same-dir]/spec.md`

Display after save:

```text
✅ Spec saved to: .claude/workspace/planning/[path]/spec.md
   Based on: sow.md (if used)
```

## Example

```bash
# After /sow
/spec
# Auto-detects latest SOW, generates spec.md in same directory

# Standalone
/spec "User registration flow"
# Creates new planning directory with spec.md
```

## Next Steps

After Spec is created:

- `/code` - Implement based on spec
- `/plans` - View created documents
- `/audit` - Review will reference spec for validation
