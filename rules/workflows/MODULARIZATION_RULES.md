# Modularization Rules

Rules for **creating** command and skill files. Developer guide for file structure and responsibility separation.

## Commands vs Skills

This plugin distinguishes:

| Type        | Location            | Purpose                     | Invocation                                     |
| ----------- | ------------------- | --------------------------- | ---------------------------------------------- |
| **Command** | `commands/*.md`     | User-facing workflows       | `/command-name`                                |
| **Skill**   | `skills/*/SKILL.md` | Knowledge base + references | Auto-loaded by context or `skill-name` trigger |

## Rules

1. **Miller's Law**: Responsibilities ≤7 (8-9: warning, >9: must split)
2. **Thin Wrapper Pattern**: Orchestration only, no implementation details
3. **2-Layer Architecture**: Skills → Commands (Agents are separate for analysis)
4. **Size Limit**: ≤100 lines (101-200: warning, >200: must split)

## When to Apply

| Condition                | Action                          |
| ------------------------ | ------------------------------- |
| Command file > 100 lines | Consider modularization         |
| Responsibilities > 7     | **Must modularize**             |
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

## Examples

### Good: Thin Wrapper (~80 lines)

```markdown
# /code

TDD implementation with RGRC cycle.

## Phase References

- [@../skills/generating-tdd-tests/SKILL.md]
- [@../skills/orchestrating-workflows/references/code-workflow.md]
```

**Why good**: Orchestrates phases, delegates details to skills.

### Bad: Monolithic (900 lines)

```markdown
# /code

## Full TDD explanation here

## Full RGRC cycle here

## Full test patterns here
```

**Why bad**: Miller's Law violation, DRY violation, hard to maintain.
