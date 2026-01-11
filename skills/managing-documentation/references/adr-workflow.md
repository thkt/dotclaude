# ADR Creation Workflow

Architecture Decision Record creation in MADR format.

## Workflow Flow

```text
/adr "Decision title"
    │
    ├─ Phase 1: Pre-Check (automated)
    │     ├─ Validate title
    │     ├─ Check duplicates
    │     └─ Assign ADR number
    │
    ├─ Phase 2: Template Selection
    │     └─ Tech/Architecture/Process/Default
    │
    ├─ Phase 3: Information Collection
    │     ├─ Context
    │     ├─ Options
    │     ├─ Decision
    │     └─ Consequences
    │
    ├─ Phase 4: ADR Generation
    │     └─ MADR format
    │
    ├─ Phase 5: Validation (automated)
    │     └─ Required sections check
    │
    └─ Phase 6: Index Update (automated)
          └─ Update README.md
```

## MADR Format

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

## ADR Numbering

```text
Location: adr/ (or ~/.claude/adr/)
Format: NNNN-slug.md (e.g., 0023-adopt-typescript.md)
Next number: Auto-detected from existing files
```

## Title Guidelines

```text
✅ Good: "Adopt Zustand for State Management"
✅ Good: "Migrate to PostgreSQL for User Data"
❌ Bad:  "State Management"  (too abstract)
❌ Bad:  "Fix bug"  (not ADR scope)
```

## Status Management

| Status       | Meaning                 |
| ------------ | ----------------------- |
| `proposed`   | Under consideration     |
| `accepted`   | Approved                |
| `deprecated` | No longer recommended   |
| `superseded` | Replaced by another ADR |

## Scripts

Pre-check and validation scripts:

```bash
# Pre-check
~/.claude/skills/creating-adrs/scripts/pre-check.sh "Title"

# Validation
~/.claude/skills/creating-adrs/scripts/validate-adr.sh FILE

# Index update
~/.claude/skills/creating-adrs/scripts/update-index.sh adr
```

## Configuration

```bash
ADR_DIRECTORY="adr"
ADR_DUPLICATE_THRESHOLD="0.7"
ADR_AUTO_VALIDATE="true"
ADR_AUTO_INDEX="true"
```

## Output

```text
adr/
├── README.md              (auto-updated)
├── 0001-initial-tech.md
└── 0023-your-new-adr.md   (newly created)
```

## Related

- Rulify workflow: [@./rulify-workflow.md](./rulify-workflow.md)
- Creating ADRs skill: [@../../creating-adrs/SKILL.md](../../creating-adrs/SKILL.md)
