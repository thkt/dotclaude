---
description: Generate project rules from ADR and integrate with CLAUDE.md
allowed-tools: Read, Write, Edit, Bash(ls:*), Grep, Glob
model: inherit
argument-hint: "[ADR number]"
dependencies: [creating-adrs, managing-documentation]
---

# /rulify - Generate Rule from ADR

Convert ADR into AI-executable rule format.

## Workflow Reference

**Full workflow**: [@../skills/managing-documentation/references/rulify-workflow.md](../skills/managing-documentation/references/rulify-workflow.md)

## Usage

```bash
/rulify 1
/rulify 0001
```

## Execution Flow

```text
1. Find ADR file (adr/XXXX-*.md)
2. Parse content (Title, Decision, Rationale)
3. Determine priority (P0-P3)
4. Generate rule file (docs/rules/[NAME].md)
5. Integrate with .claude/CLAUDE.md
```

## Priority Mapping

| Condition                 | Priority |
| ------------------------- | -------- |
| Security/Auth related     | P0       |
| Language/Framework config | P1       |
| Development process       | P2       |
| Recommendations           | P3       |

## Output

```text
Rule Generated

  ADR: adr/0001-title.md
  Rule: docs/rules/RULE_NAME.md
  Integrated: .claude/CLAUDE.md
```

## Error Handling

| Error         | Resolution        |
| ------------- | ----------------- |
| ADR not found | Check `adr/`      |
| Rule exists   | Confirm overwrite |
| No CLAUDE.md  | Create new file   |

## Best Practices

1. Convert immediately after ADR creation
2. Verify generated priority level
3. Git commit rule files

```bash
git add docs/rules/*.md .claude/CLAUDE.md
git commit -m "docs: add rule from ADR-XXXX"
```

## Related

- `/adr` - Create ADR
- `/audit` - Review rule application
