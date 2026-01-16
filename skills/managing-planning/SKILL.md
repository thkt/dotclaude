---
name: managing-planning
description: >
  Planning workflow patterns: SOW generation, Spec creation, Q&A clarification, validation.
  Triggers: SOW, Spec, planning, validation, acceptance criteria, requirements, /think, /sow, /spec.
allowed-tools: [Read, Write, Grep, Glob, Task]
user-invocable: false
---

# Managing Planning Workflows

## Workflows

| Workflow            | Reference                              | Command   |
| ------------------- | -------------------------------------- | --------- |
| SOW Generation      | [@./references/sow-generation.md]      | /sow      |
| Spec Generation     | [@./references/spec-generation.md]     | /spec     |
| Think Orchestration | [@./references/think-workflow.md]      | /think    |
| Validation          | [@./references/validation-criteria.md] | /validate |

## Planning Flow

/research → /think → /code → /test → /audit → /validate

## Confidence Markers

| Marker | Confidence | Usage                           |
| ------ | ---------- | ------------------------------- |
| [✓]    | ≥95%       | Verified (file:line required)   |
| [→]    | 70-94%     | Inferred (state reasoning)      |
| [?]    | <70%       | Hypothesis (needs confirmation) |

## Templates

- SOW: `~/.claude/templates/sow/template.md`
- Spec: `~/.claude/templates/spec/template.md`
