# Skill Format Guide

Official format for Claude Code Skills. Based on <https://code.claude.com/docs/en/skills>

## Required Fields

```yaml
---
name: skill-name # lowercase, hyphens, max 64 chars
description: > # max 1024 chars, include triggers
  Brief summary with trigger keywords.
  Triggers: "keyword1", "keyword2", "キーワード".
allowed-tools: # Optional but recommended
  - Read
  - Write
  - Grep
---
```

## Naming Convention

**Use gerund form** (verb-ing):

| Pattern | Examples                                                        |
| ------- | --------------------------------------------------------------- |
| Good    | `creating-adrs`, `optimizing-performance`, `reviewing-security` |
| Avoid   | `helper`, `utils`, `tools` (too vague)                          |

## Directory Structure

```text
skill-name/
├── SKILL.md (required)
└── references/ (optional)
    └── detailed-guide.md
```

**Progressive Loading**: Claude reads SKILL.md first, references only when needed.

## Description Requirements

1. **Third person only**: "Processes files" not "I can help you"
2. **Include triggers**: List keywords in EN/JP
3. **Max 1024 characters**

## Non-Official Fields (Do NOT Use)

These fields are ignored: `version`, `author`, `triggers`, `sections`, `patterns`, `tokens`

## Validation Checklist

### YAML Front Matter

- [ ] `name`: lowercase with hyphens, ≤64 chars
- [ ] `description`: ≤1024 chars, includes triggers
- [ ] `allowed-tools`: specified
- [ ] No non-official fields

### Content

- [ ] Clear, narrow focus
- [ ] Step-by-step instructions
- [ ] Examples included

### Bilingual (if applicable)

- [ ] JP version exists in `.ja/skills/`
- [ ] Structure matches EN version
- [ ] Trigger keywords translated

## Related

- [Official Skills Guide](https://code.claude.com/docs/en/skills)
