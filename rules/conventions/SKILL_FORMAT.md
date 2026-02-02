---
paths:
  - ".claude/skills/**"
---

# Skill Format Guide

Official format for Claude Code Skills. Based on <https://code.claude.com/docs/en/skills>

## YAML Frontmatter

```yaml
---
name: skill-name # lowercase, hyphens, max 64 chars
description: > # max 1024 chars, include "Use when"
  Brief summary of capabilities.
  Use when [scenario] or when user mentions keyword1, keyword2, キーワード.
allowed-tools: # Recommended - prevents "tool not allowed" errors
  - Read
  - Write
  - Grep
agent: agent-name # Optional: links to corresponding agent in agents/
context: fork # Optional: run in forked sub-agent context
user-invocable: false # Optional: default false
---
```

## Skill vs Agent Fields

| Field            | Skill                    | Agent      | Notes                                 |
| ---------------- | ------------------------ | ---------- | ------------------------------------- |
| `name`           | ✓ Required               | ✓ Required | Identifier                            |
| `description`    | ✓ Required               | ✓ Required | Purpose, "Use when" pattern           |
| `allowed-tools`  | Recommended              | -          | Tool permissions for skill            |
| `tools`          | -                        | ✓ Required | Tool permissions for agent            |
| `agent`          | Optional                 | -          | Links skill to agent                  |
| `context`        | Optional                 | Optional   | fork = sub-agent, inline = main agent |
| `user-invocable` | Optional (default false) | -          | Allow direct user invocation          |
| `model`          | -                        | Optional   | LLM selection                         |

## Naming Convention

Use gerund form (verb-ing):

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

Progressive Loading: Claude reads SKILL.md first, references only when needed.

## Description Requirements

| Rule     | Requirement            | Example                                                                    |
| -------- | ---------------------- | -------------------------------------------------------------------------- |
| Voice    | Third person only      | "Processes files" not "I can help you"                                     |
| Format   | Use "Use when" pattern | `Use when reviewing code for issues or when user mentions security, OWASP` |
| Keywords | Include EN/JP trigger  | `Use when ... or when user mentions security, セキュリティ`                |
| Length   | Max 1024 characters    | -                                                                          |

## Validation

| Check               | Criteria                                            |
| ------------------- | --------------------------------------------------- |
| YAML Front Matter   | name ≤64 chars, description ≤1024 chars, "Use when" |
| Content             | Narrow scope, step-by-step, examples                |
| Bilingual Structure | `.ja/skills/` matches EN structure                  |

## Reference Depth (Skills Only)

Keep references one level deep from SKILL.md to avoid partial reads.

| Pattern | Example                             | Status |
| ------- | ----------------------------------- | ------ |
| Good    | SKILL.md → reference.md             | ✓      |
| Bad     | SKILL.md → advanced.md → details.md | ✗      |

Reason: Claude may use `head -100` for deeply nested files, resulting in incomplete information.

## Content Size Guidelines

| Rule            | Threshold  | Action                     |
| --------------- | ---------- | -------------------------- |
| SKILL.md body   | 500 lines  | Split into reference files |
| Reference files | 100+ lines | Add TOC at top             |

TOC example for long files:

```markdown
## Contents

- Section 1
- Section 2
- Section 3
```
