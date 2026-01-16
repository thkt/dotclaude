# ADR Workflow

## Flow

```text
/adr "Title" → Pre-Check → Template → Collection → Generate → Validate → Index
```

## MADR Format

```markdown
# ADR-NNNN: [Title]

## Status

Proposed | Accepted | Deprecated | Superseded

## Context

[Issue]

## Decision

[Choice]

## Consequences

[Results]
```

## Numbering

```text
Location: adr/ or ~/.claude/adr/
Format: NNNN-slug.md (e.g., 0023-adopt-typescript.md)
```

## Status

| Status       | Meaning               |
| ------------ | --------------------- |
| `proposed`   | Under consideration   |
| `accepted`   | Approved              |
| `deprecated` | No longer recommended |
| `superseded` | Replaced by another   |

## Title Guidelines

| Good                                 | Bad                               |
| ------------------------------------ | --------------------------------- |
| "Adopt Zustand for State Management" | "State Management" (too abstract) |
| "Migrate to PostgreSQL"              | "Fix bug" (not ADR scope)         |

## Scripts

```bash
~/.claude/skills/creating-adrs/scripts/pre-check.sh "Title"
~/.claude/skills/creating-adrs/scripts/validate-adr.sh FILE
~/.claude/skills/creating-adrs/scripts/update-index.sh adr
```
