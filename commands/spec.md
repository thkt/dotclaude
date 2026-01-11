---
description: Generate Specification (spec.md) with implementation-ready details
allowed-tools: Read, Write, Glob, Grep, LS
model: inherit
argument-hint: "[sow path or feature description]"
dependencies: [formatting-audits, managing-planning]
---

# /spec - Specification Generator

Generate spec.md with implementation-ready details.

## Workflow Reference

**Full workflow**: [@../skills/managing-planning/references/spec-generation.md](../skills/managing-planning/references/spec-generation.md)

## Input Resolution

```text
/spec execution
    ├─ Argument provided? → Use as input
    └─ No argument → Auto-detect latest SOW
```

## SOW Auto-Detection

```bash
!`ls -t .claude/workspace/planning/*/sow.md 2>/dev/null | head -1 || echo "(no SOW)"`
```

## Required Sections

1. Functional Requirements (FR-001...)
2. Data Model (TypeScript interfaces)
3. Implementation Details
4. Test Scenarios (Given-When-Then)
5. Non-Functional Requirements (NFR-001...)
6. Dependencies
7. Implementation Checklist

## Confidence Markers

| Range        | Meaning              |
| ------------ | -------------------- |
| [C: 0.9+]    | Verified (file:line) |
| [C: 0.7-0.9] | Inferred             |
| [C: <0.7]    | Uncertain            |

## Traceability

- FR-001 `Implements: AC-001` → Links to SOW AC
- T-001 `Validates: FR-001` → Test validates requirement

## Output

```text
Save to: .claude/workspace/planning/[same-dir]/spec.md
```

## Next Steps

- `/code` - Implement based on spec
- `/plans` - View created documents
