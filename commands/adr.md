---
description: Create Architecture Decision Records (ADR) in MADR format with auto-numbering
allowed-tools: Read, Write, Bash(ls:*), Bash(cat:*), Bash($HOME/.claude/skills/creating-adrs/scripts/*), Grep, Glob
model: opus
argument-hint: "[decision title]"
---

# /adr - Architecture Decision Record Creator

Create ADR in MADR format with auto-numbering.

## Input

- Decision title: `$1` (specific action like "Adopt X for Y")
- If `$1` is empty → prompt via AskUserQuestion
- Prerequisites: `adr/` directory (create if missing)

## Skills

| Name          | Purpose                        |
| ------------- | ------------------------------ |
| creating-adrs | Templates, validation, scripts |

## Output

- `adr/XXXX-slug.md` (ADR file)
- `adr/README.md` (index update)
