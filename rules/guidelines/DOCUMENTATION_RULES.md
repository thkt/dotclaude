# Documentation Rules

Guidelines for consistent documentation in the Claude Code ecosystem.

## Core Principles

1. **Clarity Over Completeness** - Apply Occam's Razor
2. **EN/JP Synchronization** - Both versions must match structure
3. **No Circular References** - Maximum 3 levels deep
4. **Mermaid Over ASCII** - Use Mermaid diagrams, not ASCII art

## Directory Structure

```text
/rules/
├── core/           # AI Operation (hook-injected)
├── guidelines/     # Documentation guidelines
├── development/    # Practical methods
└── commands/       # Command-specific rules

/skills/            # Knowledge base (SOLID, DRY, etc.)
```

**Placement**: Principle → guidelines/, Practice → development/, Command → commands/

## Reference Rules

| Rule            | Guideline                         |
| --------------- | --------------------------------- |
| Max depth       | 3 levels                          |
| Circular refs   | Forbidden (A → B → A)             |
| Section name    | Use `## Related Principles`       |
| Core principles | Reference directly from CLAUDE.md |

## Language Synchronization

- EN: `/path/to/FILE.md`
- JP: `/.ja/path/to/FILE.md`

**ADR exception**: Written in Japanese by default, no `.ja/` needed.

## Update Checklist

| Operation | Steps                                   |
| --------- | --------------------------------------- |
| Add       | Create EN+JP → Add to CLAUDE.md         |
| Modify    | grep refs → Update EN+JP → Verify links |
| Move      | Search refs → Move EN+JP → Update refs  |

## Writing Standards

- Headers: Sentence case
- Examples: Bad vs Good comparisons
- Diagrams: Mermaid or tables (no ASCII)
- Comments: Use text labels in AI docs, emojis OK in human output

## Anti-Patterns

| Avoid                    | Instead        |
| ------------------------ | -------------- |
| Single language updates  | EN/JP together |
| Deep nesting (>3 levels) | Flat hierarchy |
| Circular references      | Tree structure |
| ASCII art diagrams       | Mermaid/tables |

## Quality Checklist

- [ ] EN/JP synchronized
- [ ] Links valid
- [ ] No circular refs
- [ ] Diagrams use Mermaid/tables
