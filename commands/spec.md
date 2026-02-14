---
description: Generate Specification (spec.md) with implementation-ready details. Use when user mentions スペック作成, 仕様書, 詳細設計, specification.
allowed-tools: Read, Write, Glob, Grep, LS, AskUserQuestion
model: opus
argument-hint: "[sow path or feature description]"
---

# /spec - Specification Generator

Generate spec.md with implementation-ready details.

## Input

- SOW path or feature description: `$1` (optional)
- If `$1` is empty and multiple SOWs exist → select via AskUserQuestion
- If `$1` is empty and single SOW → auto-detect latest

### SOW Selection

List SOWs → present as AskUserQuestion options with feature name + status.

## Execution

Generate spec from SOW using template (ID format: FR-001, T-001, NFR-001).

Template: [@../templates/spec/template.md](../templates/spec/template.md)

Traceability: `FR-001 Implements: AC-001` → `T-001 Validates: FR-001`

## Component API (Frontend)

If UI-related, include: Props table, variants, states, usage examples.

## Output

Always use this exact path — Write tool creates parent directories if absent.

File: `.claude/workspace/planning/[same-dir]/spec.md`
