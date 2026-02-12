---
paths:
  - ".claude/skills/**"
  - ".claude/commands/**"
---

# Modularization Rules

## Commands vs Skills

| Type    | Location            | Purpose                     | Invocation                                     |
| ------- | ------------------- | --------------------------- | ---------------------------------------------- |
| Command | `commands/*.md`     | User-facing workflows       | `/command-name`                                |
| Skill   | `skills/*/SKILL.md` | Knowledge base + references | Auto-loaded by context or `skill-name` trigger |

## Rules

| Rule                 | Guideline                                            |
| -------------------- | ---------------------------------------------------- |
| Miller's Law         | Responsibilities ≤7 (8-9: warning, >9: must split)   |
| Thin Wrapper Pattern | Orchestration only, no implementation details        |
| 2-Layer Architecture | Skills → Commands (Agents are separate for analysis) |
| Size Limit           | ≤100 lines (101-200: warning, >200: must split)      |

## When to Apply

| Condition                | Action                          |
| ------------------------ | ------------------------------- |
| Command file > 100 lines | Consider modularization         |
| Responsibilities > 7     | Must modularize                 |
| Multi-phase workflow     | Reference skills for each phase |
| Reusable knowledge       | Extract to skills/              |

## Structure

```text
commands/
└── [command].md

skills/[skill-name]/
├── SKILL.md
└── references/
    ├── [workflow].md
    └── [topic].md
```

## Reference Patterns

Commands reference skills in two ways:

| Pattern        | Syntax                                  | Use Case                          |
| -------------- | --------------------------------------- | --------------------------------- |
| @import        | `[@../skills/name/references/file.md]`  | Inline content (templates, data)  |
| Name reference | `Skill: skill-name (description)`       | Skill auto-loading by Skill tool  |

## Examples

### Good: Thin Wrapper (~80 lines)

```markdown
# /code

TDD implementation with RGRC cycle.

## Skills & Agents

- Skill: orchestrating-workflows (RGRC cycle)
- Agent: test-generator (TDD test generation, fork)

## Phase References

- [@../skills/orchestrating-feature/references/exploration-team.md]
```

Why good: Orchestrates phases, delegates details to skills.

### Bad: Monolithic (900 lines)

```markdown
# /code

## Full TDD explanation here

## Full RGRC cycle here

## Full test patterns here
```

Why bad: Miller's Law violation, DRY violation, hard to maintain.
