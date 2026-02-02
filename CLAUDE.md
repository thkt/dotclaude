# CLAUDE.md

## Rules

| Rule   | Reference                                                                                          |
| ------ | -------------------------------------------------------------------------------------------------- |
| Core   | AI_OPERATION_PRINCIPLES.md (rules/core/)                                                           |
| Task   | PRE_TASK_CHECK.md (rules/core/)                                                                    |
| Delete | `mv [file] ~/.Trash/ && git add -A` (sandbox error → retry with `dangerouslyDisableSandbox: true`) |

## Development Checks

| Question              | Principle     |
| --------------------- | ------------- |
| Simpler way?          | Occam's Razor |
| <1 min to understand? | Miller's Law  |
| Duplicating?          | DRY           |
| Needed now?           | YAGNI         |

## Completion

| Condition     | Requirements                            |
| ------------- | --------------------------------------- |
| Before report | tests pass, build pass, lint pass       |
| Never report  | failing tests, build errors, unresolved |

| Discovery | Order                               |
| --------- | ----------------------------------- |
| Commands  | README.md → package.json → ask user |

References: WORKFLOW_GUIDE.md (rules/workflows/), DOCUMENTATION.md (rules/conventions/)
