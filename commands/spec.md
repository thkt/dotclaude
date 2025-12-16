---
description: >
  Generate Specification (spec.md) from SOW. Creates implementation-ready details as a single artifact.
  Use after /sow or standalone for features with clear requirements.
allowed-tools: Read, Write, Glob, Grep, LS
model: inherit
argument-hint: "[sow path or feature description]"
dependencies: []
---

# /spec - Specification Generator

## Purpose

Generate spec.md only (single artifact) with implementation-ready details.

## Golden Master Reference

Use for **structure and section order ONLY**:
[@~/.claude/golden-masters/documents/spec/example-workflow-improvement.md]

**IMPORTANT**:

- ✅ Copy: Section headers, FR/NFR format, TypeScript interface patterns
- ❌ Do NOT copy: Actual content, specific values, examples from the reference
- Generate fresh content based on SOW or feature description

## Input Detection

Auto-detect SOW if not specified:

```bash
!`ls -t .claude/workspace/planning/*/sow.md 2>/dev/null | head -1 || ls -t ~/.claude/workspace/planning/*/sow.md 2>/dev/null | head -1 || echo "(no SOW found)"`
```

If SOW found, reference it for consistency.

## Confidence Markers

Inherit from SOW and add:

- **[✓]** FR-xxx: Verified requirement from SOW
- **[→]** FR-xxx: Inferred from SOW analysis
- **[?]** FR-xxx: Needs clarification

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
