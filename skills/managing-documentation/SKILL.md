---
name: managing-documentation
description: >
  Documentation generation workflows: ADR creation, skill generation, rule generation.
  Triggers: ADR, documentation, architecture decision, rulify, skill generation, MADR.
allowed-tools: [Read, Write, Grep, Glob, Edit]
user-invocable: false
---

# Managing Documentation

## Workflows

| Workflow     | Reference                          | Command |
| ------------ | ---------------------------------- | ------- |
| ADR Creation | [@./references/adr-workflow.md]    | /adr    |
| Rulify       | [@./references/rulify-workflow.md] | /rulify |

## ADR Format (MADR)

```markdown
# ADR-NNNN: [Title]

## Status

Proposed | Accepted | Deprecated | Superseded

## Context

[What is the issue?]

## Decision

[What is the decision?]

## Consequences

[What are the results?]
```

## Rulify Flow

ADR (decision) → Rule (enforcement) → CLAUDE.md (integration)
