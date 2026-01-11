# Command Modularization

Rules for modularizing command files to maintain cognitive simplicity and improve maintainability.

## Rule

1. **Miller's Law (7±2)**: Command responsibilities must stay within 7±2 items
2. **Thin Wrapper Pattern**: Main command file contains only references, no logic
3. **3-Layer Architecture**: Skills (educational) → Shared (implementation) → Commands (execution)
4. **Reference-Based Modularization**: Place details in `references/commands/[command]/` or `skills/*/references/`

## Rationale

Extracted from ADR 0001/0002. These patterns reduce cognitive load and improve maintainability:

- **Cognitive Load**: Humans can only process 7±2 items in working memory (Miller's Law)
- **Maintainability**: Smaller files with single responsibility are easier to update
- **Reusability**: Shared modules (TDD, quality gates) can be referenced by multiple commands
- **Testability**: Individual modules can be tested in isolation

## When to Apply

| Condition                | Action                        |
| ------------------------ | ----------------------------- |
| Command file > 100 lines | Consider modularization       |
| Responsibilities > 7     | **Must modularize**           |
| Multi-phase workflow     | Split into phase modules      |
| Shared logic exists      | Extract to shared/ or skills/ |

## Structure

```text
commands/
└── [command].md              # Thin wrapper (< 200 lines)

references/commands/[command]/
├── phase-1.md               # Phase-specific details
├── phase-2.md
└── completion.md

OR

skills/[skill-name]/
├── SKILL.md                 # Educational content
└── references/
    └── [topic].md           # Implementation details
```

## Examples

### Good

**commands/code.md** (89 lines, thin wrapper):

```markdown
# /code

...brief overview...

## Phase References

- Phase 0: [@../skills/generating-tdd-tests/SKILL.md]
- RGRC Cycle: [@../skills/orchestrating-workflows/references/code-workflow.md]
```

**Responsibilities**: 6 (within 7±2)

### Bad

**commands/code.md** (900 lines, monolithic):

```markdown
# /code

## Everything in one file

- 10+ responsibilities
- Duplicated TDD knowledge
- Hard to maintain
```

**Issues**:

- Miller's Law violation (10+ responsibilities)
- DRY violation (duplicated content)
- Hard to test individual features

## Checklist

Before creating/modifying a command:

- [ ] Responsibility count ≤ 7
- [ ] Main file ≤ 200 lines
- [ ] Details in references/ or skills/
- [ ] Existing skills reused (DRY)
- [ ] No duplicated knowledge

## Metrics

| Metric           | Threshold | Action                  |
| ---------------- | --------- | ----------------------- |
| Responsibilities | ≤ 7       | OK                      |
|                  | 8-9       | Warning, consider split |
|                  | > 9       | **Must split**          |
| Main file lines  | ≤ 200     | OK                      |
|                  | 201-300   | Warning                 |
|                  | > 300     | **Must split**          |

## Related ADRs

- [ADR 0001](../../adr/0001-code-command-responsibility-separation.md) - /code modularization decision
- [ADR 0002](../../adr/0002-fix-modularization-and-tdd-commonization.md) - /fix modularization and TDD commonization

## Related Principles

- [@../PRINCIPLES_GUIDE.md](../PRINCIPLES_GUIDE.md) - Miller's Law, SOLID principles
- [@../../skills/applying-code-principles/SKILL.md](../../skills/applying-code-principles/SKILL.md) - Code principles
