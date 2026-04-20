---
name: adr
description: Create Architecture Decision Records (ADR) in MADR format with auto-numbering. Use when: ADR作成, 技術決定, アーキテクチャ決定, decision record.
allowed-tools: Read, Write, Grep, Glob, LS, AskUserQuestion
model: opus
argument-hint: "[decision title]"
user-invocable: true
---

# /adr - Architecture Decision Record Creator

Thin wrapper. Templates, validation, and scripts live in `creating-adrs` skill.

## Input

- Decision title: `$1` (specific action like "Adopt X for Y")
- If `$1` is empty → select via AskUserQuestion
- Prerequisites: `adr/` directory (create if missing)

### Title Prompt

| Question      | Options                        |
| ------------- | ------------------------------ |
| Decision type | New decision / Update existing |

If "Update existing" → list recent ADRs in `adr/` for selection via AskUserQuestion.

## Output

- `adr/XXXX-slug.md` (ADR file)
- `adr/README.md` (index update)
