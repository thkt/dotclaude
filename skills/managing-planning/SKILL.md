---
name: managing-planning
description: >
  Planning workflow patterns: SOW generation, Spec creation, Q&A clarification, validation.
  Triggers: SOW, Spec, planning, validation, acceptance criteria, requirements, /think, /sow, /spec.
allowed-tools: [Read, Write, Grep, Glob, Task]
user-invocable: false
---

# Managing Planning Workflows

Planning workflow patterns for SOW, Spec, and validation processes.

## Workflow References

| Workflow            | Reference                              | Command   |
| ------------------- | -------------------------------------- | --------- |
| SOW Generation      | [@./references/sow-generation.md]      | /sow      |
| Spec Generation     | [@./references/spec-generation.md]     | /spec     |
| Think Orchestration | [@./references/think-workflow.md]      | /think    |
| Validation          | [@./references/validation-criteria.md] | /validate |

## Planning Flow

```text
/research → /think → /code → /test → /audit → /validate
```

## SOW Structure

| Section             | Purpose                      |
| ------------------- | ---------------------------- |
| Executive Summary   | 1-2 sentence overview        |
| Problem Analysis    | Current state, issues        |
| Assumptions         | Facts, assumptions, unknowns |
| Solution Design     | Approach, alternatives       |
| Acceptance Criteria | AC-001, AC-002, ...          |
| Implementation Plan | Phases, progress matrix      |
| Risks               | R-001, R-002, ...            |

## Spec Structure

| Section                     | Purpose               |
| --------------------------- | --------------------- |
| Functional Requirements     | FR-001, FR-002, ...   |
| Data Model                  | TypeScript interfaces |
| Test Scenarios              | T-001, T-002, ...     |
| Non-Functional Requirements | NFR-001, NFR-002, ... |
| Traceability Matrix         | AC → FR → Test → NFR  |

## Confidence Markers

| Marker | Confidence | Usage                           |
| ------ | ---------- | ------------------------------- |
| [✓]    | ≥95%       | Verified (file:line required)   |
| [→]    | 70-94%     | Inferred (state reasoning)      |
| [?]    | <70%       | Hypothesis (needs confirmation) |

## Templates

- SOW: `~/.claude/templates/sow/template.md`
- Spec: `~/.claude/templates/spec/template.md`
