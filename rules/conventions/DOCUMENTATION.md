---
paths:
  - ".claude/**/*.md"
  - "docs/**"
  - "**/*.mdx"
---

# Documentation Rules

Guidelines for consistent documentation in the Claude Code ecosystem.

## Core Principles

| Principle                 | Guideline                             |
| ------------------------- | ------------------------------------- |
| Clarity Over Completeness | Apply Occam's Razor                   |
| EN/JP Synchronization     | Both versions must match structure    |
| No Circular References    | Skills: 1 level, Rules/Docs: 3 levels |
| Mermaid Over ASCII        | Use Mermaid in .md files only         |

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
| Max depth      | Skills: 1 level, Rules/Docs: 3 levels             |
| Circular refs  | Forbidden (A → B → A)                             |
| Redundant refs | Don't reference files already loaded by CLAUDE.md |
| Context-needed | Only reference when required for current context  |
| Relative paths | Use `./` for same dir, `../` for one level up     |
| Deep paths     | `../../` acceptable but document in README        |
| Deep path note | Verify after any file reorganization              |

## Language Synchronization

See [@./TRANSLATION.md](./TRANSLATION.md)

## Update Checklist

| Operation | Steps                                   |
| --------- | --------------------------------------- |
| Add       | Create EN+JP → Add to CLAUDE.md         |
| Modify    | grep refs → Update EN+JP → Verify links |
| Move      | Search refs → Move EN+JP → Update refs  |

## Writing Standards

| Element  | Standard                                          |
| -------- | ------------------------------------------------- |
| Headers  | Sentence case                                     |
| Examples | Bad vs Good comparisons                           |
| Comments | Text labels in AI docs, emojis OK in human output |

## Formatting Rules

| Rule               | Reference                                           |
| ------------------ | --------------------------------------------------- |
| Template Variables | [@./TEMPLATE_VARIABLES.md](./TEMPLATE_VARIABLES.md) |
| Bold formatting    | Avoid - use structure (tables, sections) instead    |

## Simplification Guidelines

| Principle             | Application                                                      |
| --------------------- | ---------------------------------------------------------------- |
| DRY                   | Same info in one place only (not in Metrics + Checklist + Rules) |
| Inline thresholds     | Include thresholds directly in rules, not separate tables        |
| Minimal examples      | Show pattern, not full implementation                            |
| No redundant comments | If explained elsewhere, don't repeat in code blocks              |
