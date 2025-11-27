---
description: >
  Create Architecture Decision Records (ADR) in MADR format with Skills integration.
  Records architecture decisions with context and rationale. Auto-numbering (0001, 0002, ...), saves to docs/adr/.
allowed-tools: Read, Write, Bash(ls:*), Bash(find:*), Bash(cat:*), Grep, Glob
model: inherit
argument-hint: "[decision title]"
---

# /adr - Architecture Decision Record Creator

## Purpose

High-quality Architecture Decision Record creation command using ADR Creator Skill.

**Detailed process**: [@~/.claude/skills/adr-creator/SKILL.md]

## Usage

```bash
/adr "Decision title"
```

**Examples:**

```bash
/adr "Adopt TypeScript strict mode"
/adr "Use Auth.js for authentication"
/adr "Introduce Turborepo for monorepo"
```

## Execution Flow (6 Phases)

```text
Phase 1: Pre-Check
  ├─ Duplicate check, naming rules, ADR number assignment
  ↓
Phase 2: Template Selection
  ├─ 1. Tech Selection / 2. Architecture Pattern / 3. Process Change / 4. Default
  ↓
Phase 3: Information Collection
  ├─ Context, Options, Decision Outcome, Consequences
  ↓
Phase 4: ADR Generation
  ├─ Generate in MADR format
  ↓
Phase 5: Validation
  ├─ Required sections, format, quality check
  ↓
Phase 6: Index Update
  └─ Auto-update docs/adr/README.md
```

## Output

```text
docs/adr/
├── README.md              (auto-updated)
├── 0001-initial-tech.md
├── 0002-adopt-react.md
└── 0023-your-new-adr.md   (newly created)
```

## Configuration

Customizable via environment variables:

```bash
ADR_DIRECTORY="docs/adr"           # ADR storage location
ADR_DUPLICATE_THRESHOLD="0.7"      # Duplicate detection threshold
ADR_AUTO_VALIDATE="true"           # Auto-validation
ADR_AUTO_INDEX="true"              # Auto-index update
```

## Best Practices

### Title Guidelines

```text
✅ Good: "Adopt Zustand for State Management"
✅ Good: "Migrate to PostgreSQL for User Data"
❌ Bad:  "State Management"  (too abstract)
❌ Bad:  "Fix bug"  (not ADR scope)
```

### Status Management

- `proposed` → Under consideration
- `accepted` → Approved
- `deprecated` → No longer recommended
- `superseded` → Replaced by another ADR

## Related Commands

- `/adr:rule <number>` - Generate project rule from ADR
- `/research` - Technical investigation before ADR creation
- `/think` - Planning before major decisions

## Error Handling

### Skill Not Found

```text
⚠️  ADR Creator Skill not found
Continuing in normal mode (interactive)
```

### Pre-Check Failure

```text
❌ Issues detected in Pre-Check
Actions: Change title / Review similar ADR / Consider consolidation
```

## References

- [ADR Creator Skill](~/.claude/skills/adr-creator/SKILL.md) - Detailed documentation
- [MADR Official Site](https://adr.github.io/madr/)
