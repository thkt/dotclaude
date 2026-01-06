---
description: Create Architecture Decision Records (ADR) in MADR format with auto-numbering
allowed-tools: Read, Write, Bash(ls:*), Bash(cat:*), Bash(~/.claude/skills/creating-adrs/scripts/*), Grep, Glob
model: inherit
argument-hint: "[decision title]"
dependencies: [creating-adrs]
---

# /adr - Architecture Decision Record Creator

## Purpose

High-quality Architecture Decision Record creation command using ADR Creator Skill.

**Detailed process**: [@../skills/creating-adrs/SKILL.md]

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

### Phase 1: Pre-Check (Automated)

**Run script**: `~/.claude/skills/creating-adrs/scripts/pre-check.sh "TITLE"`

```bash
# Validates title, checks duplicates, assigns ADR number
~/.claude/skills/creating-adrs/scripts/pre-check.sh "Decision title"
```

Script outputs JSON with `number`, `filename`, `slug`, `date` for subsequent phases.
If script fails → stop and report issues to user.

### Phase 2: Template Selection

1. Tech Selection / 2. Architecture Pattern / 3. Process Change / 4. Default

Select based on decision type. Templates at `~/.claude/skills/creating-adrs/assets/`.

### Phase 3: Information Collection

Collect from user: Context, Options, Decision Outcome, Consequences

### Phase 4: ADR Generation

Generate ADR in MADR format using collected information.

### Phase 5: Validation (Automated)

**Run script**: `~/.claude/skills/creating-adrs/scripts/validate-adr.sh FILE`

```bash
# Validates required sections, metadata, content quality
~/.claude/skills/creating-adrs/scripts/validate-adr.sh docs/adr/XXXX-slug.md
```

If validation fails → show issues and allow correction.

### Phase 6: Index Update (Automated)

**Run script**: `~/.claude/skills/creating-adrs/scripts/update-index.sh`

```bash
# Updates docs/adr/README.md with all ADRs
~/.claude/skills/creating-adrs/scripts/update-index.sh docs/adr
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

- `/rulify <number>` - Generate project rule from ADR
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

- [ADR Creator Skill](~/.claude/skills/creating-adrs/SKILL.md) - Detailed documentation
- [MADR Official Site](https://adr.github.io/madr/)
