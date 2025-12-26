---
description: Generate project rules from ADR and integrate with CLAUDE.md
allowed-tools: Read, Write, Edit, Bash(ls:*), Grep, Glob
model: inherit
argument-hint: "[ADR number]"
dependencies: [creating-adrs]
---

# /rulify - Generate Rule from ADR

## Purpose

Convert ADR (Architecture Decision Record) into AI-executable rule format.
Auto-integrates with project's `.claude/CLAUDE.md`.

## Usage

```bash
/rulify <ADR-number>
```

Examples: `/rulify 1`, `/rulify 0001`, `/rulify 12`

## Execution Flow

### 1. Find ADR File

```bash
# Zero-pad and find
ADR_NUM=$(printf "%04d" $1)
ADR_FILE=$(ls docs/adr/${ADR_NUM}-*.md 2>/dev/null | head -1)
```

### 2. Parse ADR Content

Extract from ADR:

- **Title** → Rule name (UPPER_SNAKE_CASE)
- **Decision Outcome** → Core instructions
- **Rationale** → Requirements
- **Consequences** → Benefits and caveats

### 3. Determine Priority

| Condition | Priority |
| --- | --- |
| Security/Auth related | P0 |
| Language/Framework config | P1 |
| Development process | P2 |
| Recommendations | P3 |

### 4. Generate Rule File

**Output**: `docs/rules/[RULE_NAME].md`

**Golden Master Reference**:
[@~/.claude/golden-masters/documents/rules/example-from-adr.md]

**IMPORTANT**:

- ✅ Copy: Section structure, format patterns
- ❌ Do NOT copy: Example content from reference
- Generate fresh content based on ADR

### 5. Integrate with CLAUDE.md

Append to `.claude/CLAUDE.md`:

```markdown
## Project Rules

Generated from ADR:

- **[Rule Name]**: [@docs/rules/[RULE_NAME].md](docs/rules/[RULE_NAME].md) (ADR-[number])
```

### 6. Completion Message

```text
✅ Rule Generated

📄 ADR: docs/adr/[number]-[title].md
📋 Rule: docs/rules/[RULE_NAME].md
🔗 Integrated: .claude/CLAUDE.md
```

## Error Handling

| Error | Message | Resolution |
| --- | --- | --- |
| ADR not found | `❌ ADR-XXXX not found` | Check `docs/adr/` |
| Invalid number | `❌ Invalid ADR number` | Use numeric value |
| Rule exists | `⚠️ Rule already exists` | Confirm overwrite |
| No CLAUDE.md | `⚠️ .claude/CLAUDE.md not found` | Create new file |

## Example

```bash
# Create ADR then convert to rule
/adr "Adopt TypeScript strict mode"
/rulify 0001

# Result:
# docs/rules/TYPESCRIPT_STRICT_MODE.md created
# .claude/CLAUDE.md updated with reference
```

## Best Practices

1. **Convert immediately** - Execute right after ADR creation
2. **Verify priority** - Check generated rule for appropriate P-level
3. **Team agreement** - Review with team before converting
4. **Git commit** - Include rule files in version control

```bash
git add docs/rules/*.md .claude/CLAUDE.md
git commit -m "docs: add rule from ADR-XXXX"
```

## Related Commands

- `/adr [title]` - Create ADR
- `/audit` - Review rule application
