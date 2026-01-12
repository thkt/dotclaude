---
description: Generate Specification (spec.md) with implementation-ready details
allowed-tools: Read, Write, Glob, Grep, LS
model: opus
argument-hint: "[sow path or feature description]"
dependencies: [formatting-audits, managing-planning]
---

# /spec - Specification Generator

Generate spec.md with implementation-ready details.

## Input

- Argument: SOW path or feature description (optional)
- If missing: auto-detect latest `.claude/workspace/planning/*/sow.md`

## Execution

Generate spec from SOW using `managing-planning` skill templates.

### Required Sections

1. Functional Requirements (FR-001...)
2. Data Model (TypeScript interfaces)
3. Implementation Details
4. Test Scenarios (Given-When-Then)
5. Non-Functional Requirements (NFR-001...)
6. Dependencies
7. Implementation Checklist

### Traceability

- FR-001 `Implements: AC-001` → Links to SOW AC
- T-001 `Validates: FR-001` → Test validates requirement

## Output

```text
.claude/workspace/planning/[same-dir]/spec.md
```
