---
paths:
  - ".claude/skills/**"
---

# Skill Conventions

Conventions for skill files under `.claude/skills/`.

## YAML Frontmatter

```yaml
---
name: skill-name               # lowercase-hyphens, ≤64 chars
description: >                 # ≤1024 chars, must include "Use when"
  Brief summary. Use when [scenario] or when user mentions keyword1, キーワード.
allowed-tools: [Read, Write]   # Recommended
agent: agent-name              # Optional: links to agents/
context: fork                  # Optional: fork = sub-agent, inline = main
user-invocable: false          # Optional: default false
---
```

## Description

| Rule     | Requirement                |
| -------- | -------------------------- |
| Voice    | Third person only          |
| Format   | Include "Use when" pattern |
| Keywords | Include EN/JP triggers     |

## Naming

Use gerund form (verb-ing).

| Pattern | Examples                               |
| ------- | -------------------------------------- |
| Good    | `creating-adrs`, `reviewing-security`  |
| Avoid   | `helper`, `utils`, `tools` (too vague) |

## Directory structure

```text
skill-name/
├── SKILL.md (required)
└── references/ (optional)
    └── detailed-guide.md
```

Claude reads SKILL.md first, references only when needed.

## Size limits

| Rule            | Threshold  | Action                     |
| --------------- | ---------- | -------------------------- |
| SKILL.md body   | 500 lines  | Split into reference files |
| Reference files | 100+ lines | Add TOC at top             |
