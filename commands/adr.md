---
description: Create Architecture Decision Records (ADR) in MADR format with auto-numbering
allowed-tools: Read, Write, Bash(ls:*), Bash(cat:*), Bash(~/.claude/skills/creating-adrs/scripts/*), Grep, Glob
model: opus
argument-hint: "[decision title]"
dependencies: [creating-adrs, managing-documentation]
---

# /adr - Architecture Decision Record Creator

Create ADR in MADR format with auto-numbering.

## Input

- Argument: decision title (required, specific action like "Adopt X for Y")
- If missing: prompt via AskUserQuestion
- Prerequisites: `adr/` directory (create if missing)

## Execution

Delegates to `creating-adrs` skill (templates, validation, scripts defined there).

## Output

- `adr/XXXX-slug.md` (ADR file)
- `adr/README.md` (index update)
