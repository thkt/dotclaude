# Templates

Structural templates referenced by commands.

## Purpose

- **Structure Guide**: Define required sections and formats for SOW/Spec/Summary
- **Minimal Context**: Provide only necessary information during command execution
- **Quality Standard**: Demonstrate confidence marker `[C: X.X]` format usage

## Directory Structure

```text
templates/
├── README.md           # This file
├── sow/
│   └── workflow-improvement.md   # SOW template
├── spec/
│   └── workflow-improvement.md   # Spec template
├── summary/
│   └── review-summary.md         # Summary template
├── rules/
│   └── from-adr.md               # Rule from ADR template
└── research/
    └── context.md                # Research context template
```

## Usage by Commands

| Command | Template | Purpose |
| --- | --- | --- |
| `/think` | sow/, spec/, summary/ | Planning document generation |
| `/sow` | sow/workflow-improvement.md | SOW generation |
| `/spec` | spec/workflow-improvement.md | Spec generation |
| `/rulify` | rules/from-adr.md | Rule generation from ADR |
| `/research` | research/context.md | Research context output |

## Relationship with golden-masters/

Details: [golden-masters/README.md](../golden-masters/README.md#relationship-with-templates)

## Customization

When customizing templates:

1. Maintain required sections (## headers)
2. Keep confidence marker `[C: X.X]` format (0.0-1.0 values)
3. Place placeholders appropriately ([Feature Name], etc.)
4. Maintain ID conventions (I-001, AC-001, FR-001, etc.)

## References

- Quality criteria: [golden-masters/QUALITY_CRITERIA.md](../golden-masters/QUALITY_CRITERIA.md)
- Example implementations: [golden-masters/documents/](../golden-masters/documents/)
