---
paths:
  - ".claude/skills/**"
---

# Modularization Rules

## Skill Types

| Type              | Location                    | Purpose                     | Invocation                                     |
| ----------------- | --------------------------- | --------------------------- | ---------------------------------------------- |
| User-invocable    | `skills/name/SKILL.md`      | User-facing workflows       | `/skill-name` (short name)                     |
| Context-triggered | `skills/verb-noun/SKILL.md` | Knowledge base + references | Auto-loaded by context or `skill-name` trigger |

## Rules

| Rule                 | Guideline                                     |
| -------------------- | --------------------------------------------- |
| Miller's Law         | Responsibilities ≤7 (8-9: warning, >9: split) |
| Thin Wrapper Pattern | Orchestration only, no implementation details |
| Unified Skills       | All in skills/ (Agents separate for analysis) |
| Size Limit           | ≤100 lines (101-200: warning, >200: split)    |

## When to Apply

| Condition              | Action                          |
| ---------------------- | ------------------------------- |
| Skill file > 100 lines | Consider modularization         |
| Responsibilities > 7   | Must modularize                 |
| Multi-phase workflow   | Reference skills for each phase |
| Reusable knowledge     | Extract to skills/              |

## Structure

```text
skills/
├── lib/              # shared @-include fragments (e.g., sow-resolution.md)
├── [short-name]/     # user-invocable: true (e.g., commit, fix, audit)
│   └── SKILL.md
└── [verb-noun]/      # user-invocable: false (e.g., reviewing-type-safety)
    ├── SKILL.md
    └── references/
        ├── [workflow].md
        └── [topic].md
```

## Naming Convention

| `user-invocable` | Name style  | Example                                            |
| ---------------- | ----------- | -------------------------------------------------- |
| `true`           | Short name  | `commit`, `fix`, `audit`                           |
| `false`          | `verb-noun` | `reviewing-type-safety`, `orchestrating-workflows` |

## Reference Patterns

Skills reference other skills via:

| Pattern        | Syntax                            | Use Case                         |
| -------------- | --------------------------------- | -------------------------------- |
| @import        | `[@../name/references/file.md]`   | Inline content (templates, data) |
| Cross-skill    | `[@../lib/file.md]`               | Shared fragments from skills/lib |
| Name reference | `Skill: skill-name (description)` | Skill auto-loading by Skill tool |

## Examples

### Good: Thin Wrapper (~80 lines)

```markdown
# /code

TDD implementation with RGRC cycle.

## Skills & Agents

- Skill: orchestrating-workflows (RGRC cycle)
- Agent: test-generator (TDD test generation, fork)
```

Orchestrates phases, delegates details to skills.

### Bad: Monolithic (900 lines)

```markdown
# /code

## Full TDD explanation here

## Full RGRC cycle here

## Full test patterns here
```

Miller's Law + DRY violation, hard to maintain.
