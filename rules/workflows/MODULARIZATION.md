---
paths:
  - ".claude/skills/**"
---

# Modularization

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
├── _lib/             # shared @-include fragments (e.g., sow-resolution.md)
├── [short-name]/     # user-invocable: true (e.g., commit, fix, audit)
│   └── SKILL.md
├── use-cli-[name]/      # user-invocable: false, CLI wrapper (e.g., use-cli-yomu)
├── use-context-[name]/  # user-invocable: false, agent-only (e.g., use-context-reviewer-security)
└── use-workflow-[name]/ # user-invocable: false, workflow (e.g., use-workflow-code)
    ├── SKILL.md
    └── references/
        ├── [workflow].md
        └── [topic].md
```

## Naming Convention

| `user-invocable` | Binding    | Name style           | Example                                             |
| ---------------- | ---------- | -------------------- | --------------------------------------------------- |
| `true`           | -          | Short name           | `commit`, `fix`, `audit`                            |
| `false`          | CLI wrap   | `use-cli-<name>`     | `use-cli-yomu`, `use-cli-recall`                    |
| `false`          | Agent-only | `use-context-<name>` | `use-context-reviewer-security`                     |
| `false`          | Workflow   | `use-workflow-<name>`| `use-workflow-code`, `use-workflow-spec-validation` |

## Reference Patterns

Skills reference other skills via:

| Pattern        | Syntax                            | Use Case                          |
| -------------- | --------------------------------- | --------------------------------- |
| @import        | `[@../name/references/file.md]`   | Inline content (templates, data)  |
| Cross-skill    | `[@../_lib/file.md]`              | Shared fragments from skills/_lib |
| Name reference | `Skill: skill-name (description)` | Skill auto-loading by Skill tool  |

## Examples

### Good: Thin Wrapper (~80 lines)

```markdown
# /code

TDD implementation with RGRC cycle.

## Skills & Agents

- Skill: use-workflow-code (RGRC cycle)
- Agent: generator-test (TDD test generation, fork)
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
