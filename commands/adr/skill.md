---
description: >
  Generate project-specific skill from ADR for context-aware implementation guidance.
allowed-tools: Read, Write, Edit, Bash(ls:*), Bash(mkdir:*), Grep, Glob
model: inherit
argument-hint: "[ADR number]"
---

# /adr:skill - Generate Skill from ADR

## Purpose

Convert Architecture Decision Record (ADR) into an executable skill format with auto-triggered implementation guidance.

## Usage

```bash
/adr:skill <ADR-number> [options]

# Examples
/adr:skill 0001              # Project-specific skill
/adr:skill 0001 --global     # Global skill (~/.claude/skills/)
/adr:skill 12 --name api-fetching  # Custom name
```

**Options:**

| Option          | Description                   |
| --------------- | ----------------------------- |
| `--global`      | Create in `~/.claude/skills/` |
| `--name <name>` | Override auto-generated name  |
| `--preview`     | Show without saving           |

## Quick Reference

### Skill vs Rule Decision

| Aspect      | /rulify                  | /adr:skill              |
| ----------- | ------------------------ | ----------------------- |
| Purpose     | Enforce constraints      | Suggest patterns        |
| Application | Always active            | Triggered by keywords   |
| Output      | docs/rules/              | .claude/skills/         |
| Use for     | Security, absolute rules | Implementation patterns |

### When to Use

**Use `/adr:skill`:**

- Implementation patterns ("HOW TO")
- Context-dependent guidance
- Detailed examples needed

**Use `/rulify`:**

- Absolute constraints ("MUST NOT")
- Security requirements
- Always-enforce rules

### Both Can Coexist

```bash
/rulify 0001     # "Must use React Query"
/adr:skill 0001  # "How to use React Query"
```

## Execution Summary

1. **Read ADR** - Parse title, context, decision, consequences
2. **Extract Keywords** - Auto-detect trigger words (EN + JA)
3. **Generate Skill** - Create SKILL.md with template
4. **Validate** - Check for duplicates, confirm keywords
5. **Save** - Write to `.claude/skills/adr-NNNN-*/`

## Output

```text
✅ Skill Generated

📄 Source: docs/adr/0001-use-react-query.md
🎯 Skill: .claude/skills/adr-0001-use-react-query/SKILL.md
🔑 Triggers: React Query, API, fetch, data fetching
```

## Detailed Reference

For complete execution flow, templates, and error handling:

[@../../skills/creating-adrs/SKILL.md](../../skills/creating-adrs/SKILL.md)

## Related Commands

- `/adr [title]` - Create ADR
- `/rulify <number>` - Generate enforcement rule
- `/research` - Technical research for ADR
