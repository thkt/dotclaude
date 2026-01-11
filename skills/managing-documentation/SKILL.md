---
name: managing-documentation
description: >
  Documentation generation workflows: ADR creation, skill generation, rule generation.
  Provides templates and processes for technical documentation.
  Triggers: ADR, documentation, architecture decision, rulify, skill generation, MADR.
allowed-tools: Read, Write, Grep, Glob, Edit
user-invocable: false
---

# Managing Documentation

Documentation generation workflows for ADRs, skills, and rules.

## Purpose

Centralize documentation workflow patterns that were embedded in individual commands.
Commands become thin orchestrators that reference this skill for documentation logic.

## Workflow References

| Workflow     | Reference                                                           | Command |
| ------------ | ------------------------------------------------------------------- | ------- |
| ADR Creation | [@./references/adr-workflow.md](./references/adr-workflow.md)       | /adr    |
| Rulify       | [@./references/rulify-workflow.md](./references/rulify-workflow.md) | /rulify |

## Quick Reference

### ADR (Architecture Decision Record)

MADR format (Markdown Any Decision Record):

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

### ADR Numbering

```text
Location: ~/.claude/adr/
Format: ADR-NNNN-title.md
Next number: Auto-detected from existing files
```

### Rulify Flow

```text
ADR (decision) → Rule (enforcement) → CLAUDE.md (integration)

1. Read ADR content
2. Extract enforceable rules
3. Generate rule file in rules/
4. Update CLAUDE.md references
```

### Documentation Guidelines

| Principle              | Application              |
| ---------------------- | ------------------------ |
| Clarity > Completeness | Apply Occam's Razor      |
| EN/JP Sync             | Both versions must match |
| No Circular Refs       | Max 3 levels deep        |
| Mermaid > ASCII        | Use Mermaid diagrams     |

## Templates

### ADR Template

```text
~/.claude/templates/adr/madr-template.md
```

### Rule Template

```text
~/.claude/templates/rules/rule-template.md
```

## References

### Principles (rules/)

- [@../../rules/guidelines/DOCUMENTATION_RULES.md](../../rules/guidelines/DOCUMENTATION_RULES.md) - Documentation guidelines
- [@../../rules/guidelines/JP_EN_TRANSLATION_RULES.md](../../rules/guidelines/JP_EN_TRANSLATION_RULES.md) - Translation rules

### Related Skills

- `creating-adrs` - ADR creation fundamentals

### Used by Commands

- `/adr` - ADR creation
- `/rulify` - Rule generation from ADR
