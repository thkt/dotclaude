---
name: managing-planning
description: >
  Planning workflow patterns: SOW generation, Spec creation, Q&A clarification, validation.
  Provides templates and processes for structured planning before implementation.
  Triggers: SOW, Spec, planning, validation, acceptance criteria, requirements, /think, /sow, /spec.
allowed-tools: Read, Write, Grep, Glob, Task
user-invocable: false
---

# Managing Planning Workflows

Planning workflow patterns for SOW, Spec, and validation processes.

## Purpose

Centralize planning workflow patterns that were embedded in individual commands.
Commands become thin orchestrators that reference this skill for planning logic.

## Workflow References

| Workflow            | Reference                                                                   | Command   |
| ------------------- | --------------------------------------------------------------------------- | --------- |
| SOW Generation      | [@./references/sow-generation.md](./references/sow-generation.md)           | /sow      |
| Spec Generation     | [@./references/spec-generation.md](./references/spec-generation.md)         | /spec     |
| Think Orchestration | [@./references/think-workflow.md](./references/think-workflow.md)           | /think    |
| Validation          | [@./references/validation-criteria.md](./references/validation-criteria.md) | /validate |

## Quick Reference

### Planning Flow

```text
/research → /think → /code → /test → /audit → /validate
    │          │
    │          ├── Q&A clarification
    │          ├── SOW generation
    │          └── Spec generation
    │
    └── Investigation only (no implementation)
```

### SOW Structure

| Section             | Purpose                      |
| ------------------- | ---------------------------- |
| Executive Summary   | 1-2 sentence overview        |
| Problem Analysis    | Current state, issues        |
| Assumptions         | Facts, assumptions, unknowns |
| Solution Design     | Approach, alternatives       |
| Acceptance Criteria | AC-001, AC-002, ...          |
| Implementation Plan | Phases, progress matrix      |
| Risks               | R-001, R-002, ...            |

### Spec Structure

| Section                     | Purpose                 |
| --------------------------- | ----------------------- |
| Functional Requirements     | FR-001, FR-002, ...     |
| Data Model                  | TypeScript interfaces   |
| Implementation              | Phase mapping, commands |
| Test Scenarios              | T-001, T-002, ...       |
| Non-Functional Requirements | NFR-001, NFR-002, ...   |
| Traceability Matrix         | AC → FR → Test → NFR    |

### Confidence Markers

| Marker | Confidence | Usage                           |
| ------ | ---------- | ------------------------------- |
| [✓]    | >0.8       | Verified (file:line required)   |
| [→]    | 0.5-0.8    | Inferred (state reasoning)      |
| [?]    | <0.5       | Hypothesis (needs confirmation) |

## Templates

### SOW Template

```text
~/.claude/templates/sow/workflow-improvement.md
```

### Spec Template

```text
~/.claude/templates/spec/workflow-improvement.md
```

### Summary Template

```text
~/.claude/templates/summary/review-summary.md
```

## References

### Principles (rules/)

- [@../../rules/core/PRE_TASK_CHECK_RULES.md](../../rules/core/PRE_TASK_CHECK_RULES.md) - Understanding check

### Related Skills

- `orchestrating-workflows` - Implementation workflows

### Used by Commands

- `/think` - Full planning orchestration
- `/sow` - SOW generation
- `/spec` - Spec generation
- `/validate` - SOW validation
- `/plans` - List planning documents
