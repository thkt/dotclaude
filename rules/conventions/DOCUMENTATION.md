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
├── conventions/    # Documentation conventions
├── development/    # Practical methods
└── workflows/      # Workflow guides & modularization rules

/skills/            # Knowledge base (SOLID, DRY, etc.)
```

## Reference Rules

| Rule           | Guideline                                         |
| -------------- | ------------------------------------------------- |
| Max depth      | 3 levels                                          |
| Circular refs  | Forbidden (A → B → A)                             |
| Redundant refs | Don't reference files already loaded by CLAUDE.md |
| Context-needed | Only reference when required for current context  |
| Relative paths | Use `./` for same dir, `../` for one level up     |
| Deep paths     | `../../` acceptable but document in README        |

**Note**: When using `../../` or deeper paths, verify after any file reorganization.

## Language Synchronization

See [@./TRANSLATION.md](./TRANSLATION.md)

## Update Checklist

| Operation | Steps                                   |
| --------- | --------------------------------------- |
| Add       | Create EN+JP → Add to CLAUDE.md         |
| Modify    | grep refs → Update EN+JP → Verify links |
| Move      | Search refs → Move EN+JP → Update refs  |

## Writing Standards

- Headers: Sentence case
- Examples: Bad vs Good comparisons
- Comments: Use text labels in AI docs, emojis OK in human output

## Formatting Rules

**Template Variables** - See [@./TEMPLATE_VARIABLES.md](./TEMPLATE_VARIABLES.md)

**Bold (`**text**`)** - Use only with clear intent:

| Valid Use             | Example                        | Purpose              |
| --------------------- | ------------------------------ | -------------------- |
| Rule/principle names  | `**Safety First**`             | Definition clarity   |
| Critical instructions | `**Never proceed**`            | Action emphasis      |
| Labels                | `**When**:`, `**Guidelines**:` | Structure indication |
| Contrast pairs        | `**using**` vs `**creating**`  | Distinction          |

**Invalid Use**: Arbitrary emphasis without purpose (e.g., highlighting new items)

## Simplification Guidelines

| Principle             | Application                                                      |
| --------------------- | ---------------------------------------------------------------- |
| DRY                   | Same info in one place only (not in Metrics + Checklist + Rules) |
| Inline thresholds     | Include thresholds directly in rules, not separate tables        |
| Minimal examples      | Show pattern, not full implementation                            |
| No redundant comments | If explained elsewhere, don't repeat in code blocks              |
