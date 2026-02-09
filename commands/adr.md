---
description: Create Architecture Decision Records (ADR) in MADR format with auto-numbering
allowed-tools: Bash(ls:*), Read, Write, Grep, Glob, AskUserQuestion
model: opus
argument-hint: "[decision title]"
---

# /adr - Architecture Decision Record Creator

Create ADR in MADR format with auto-numbering.

## Input

- Decision title: `$1` (specific action like "Adopt X for Y")
- If `$1` is empty → select via AskUserQuestion
- Prerequisites: `adr/` directory (create if missing)

### Title Prompt

| Question      | Options                        |
| ------------- | ------------------------------ |
| Decision type | New decision / Update existing |

If "Update existing" → list recent ADRs in `adr/` for selection via AskUserQuestion.

## Skills

| Name          | Purpose                        |
| ------------- | ------------------------------ |
| creating-adrs | Templates, validation, scripts |

## Output

- `adr/XXXX-slug.md` (ADR file)
- `adr/README.md` (index update)
