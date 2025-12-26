---
description: List all hookify rules
dependencies: [creating-hooks]
---

# /hookify:list - Show Hook Rules

Display all custom hook rules created with `/hookify`.

## Process

1. **Search** for hookify rule files in both locations:
   - Project-local: `.claude/hookify.*.local.md`
   - Global: `~/.claude/hookify.*.local.md`
2. **Parse** YAML frontmatter from each file
3. **Display** rules in table format with scope indicator

## Output Format

```text
┌─────────────────────────────────────────────────────────────┐
│ 🔧 Hookify Rules                                            │
├─────────────────────────────────────────────────────────────┤
│ # │ Name              │ Event │ Action │ Enabled │ Pattern │
├───┼───────────────────┼───────┼────────┼─────────┼─────────┤
│ 1 │ block-dangerous   │ bash  │ block  │ ✅      │ rm -rf  │
│ 2 │ warn-console-log  │ file  │ warn   │ ✅      │ console │
│ 3 │ require-tests     │ stop  │ block  │ ❌      │ test    │
└─────────────────────────────────────────────────────────────┘
```

## Instructions

1. Use Glob to find all `.claude/hookify.*.local.md` files
2. Read each file and extract YAML frontmatter
3. Display formatted table with rule information
4. Show ✅ for enabled, ❌ for disabled
