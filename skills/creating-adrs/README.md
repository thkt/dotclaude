# ADR Creator Skill

Create Architecture Decision Records (ADR) in MADR format.

## Overview

Record architectural decisions in a structured format to document technical choices for your project.

## Usage

```bash
/adr "Decision Title"
```

## Structure

```text
adr-creator/
├── SKILL.md           # Main skill definition (6-phase workflow)
├── README.md          # This file
├── scripts/           # Automation scripts (integrated into /adr command)
│   ├── pre-check.sh       # Phase 1: Duplicate check, naming validation, numbering
│   ├── validate-adr.sh    # Phase 5: Quality validation
│   └── update-index.sh    # Phase 6: Index update
├── assets/            # ADR templates
│   ├── technology-selection.md
│   ├── architecture-pattern.md
│   ├── process-change.md
│   └── deprecation.md
└── references/        # Checklists
    ├── impact-analysis.md
    ├── test-coverage.md
    └── rollback-plan.md
```

## Script Integration

Scripts are automatically called by the `/adr` command:

| Phase | Script | Purpose |
| --- | --- | --- |
| 1 | `pre-check.sh` | Validate title, check duplicates, assign ADR number |
| 5 | `validate-adr.sh` | Verify required sections, metadata, content quality |
| 6 | `update-index.sh` | Update docs/adr/README.md index |

## Output Language

**ADRs are generated in Japanese.**

Templates are in English for MADR standard compatibility, but content is translated to Japanese during generation. This is because ADRs are documents reviewed by humans.

## Related Commands

- `/adr` - Create ADR (calls scripts automatically)
- `/rulify` - Generate project rules from ADR

## Details

See `SKILL.md` for complete documentation.
