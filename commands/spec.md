---
description: Generate Specification (spec.md) with implementation-ready details
allowed-tools: Read, Write, Glob, Grep, LS
model: opus
argument-hint: "[sow path or feature description]"
---

# /spec - Specification Generator

Generate spec.md with implementation-ready details.

## Input

- Argument: SOW path or feature description (optional)
- If missing: auto-detect latest `.claude/workspace/planning/*/sow.md`

## Execution

Generate spec from SOW using template (ID format: FR-001, T-001, NFR-001).

Template: [@../../templates/spec/template.md](../../templates/spec/template.md)

Traceability: `FR-001 Implements: AC-001` → `T-001 Validates: FR-001`

## Output

File: `.claude/workspace/planning/[same-dir]/spec.md`
