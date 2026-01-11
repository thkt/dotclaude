---
description: Create Architecture Decision Records (ADR) in MADR format with auto-numbering
allowed-tools: Read, Write, Bash(ls:*), Bash(cat:*), Bash(~/.claude/skills/creating-adrs/scripts/*), Grep, Glob
model: inherit
argument-hint: "[decision title]"
dependencies: [creating-adrs, managing-documentation]
---

# /adr - Architecture Decision Record Creator

Create ADRs in MADR format with automation.

## Workflow Reference

**Full workflow**: [@../skills/managing-documentation/references/adr-workflow.md](../skills/managing-documentation/references/adr-workflow.md)

**Skill details**: [@../skills/creating-adrs/SKILL.md](../skills/creating-adrs/SKILL.md)

## Usage

```bash
/adr "Adopt TypeScript strict mode"
/adr "Use Auth.js for authentication"
```

## Execution Phases

1. **Pre-Check** - Validates title, checks duplicates, assigns number
2. **Template Selection** - Tech/Architecture/Process/Default
3. **Information Collection** - Context, Options, Decision
4. **ADR Generation** - MADR format
5. **Validation** - Required sections check
6. **Index Update** - Updates README.md

## Output

```text
adr/
├── README.md              (auto-updated)
└── 0023-your-new-adr.md   (newly created)
```

## Title Guidelines

```text
[good] "Adopt Zustand for State Management"
[bad]  "State Management" (too abstract)
```

## Status Values

- `proposed` → Under consideration
- `accepted` → Approved
- `deprecated` → No longer recommended
- `superseded` → Replaced by another

## Related

- `/rulify` - Generate rule from ADR
- `/research` - Investigation before ADR
