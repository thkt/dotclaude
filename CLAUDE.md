# CLAUDE.md

## Rules

| Rule        | Reference                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------- |
| Core        | [@./rules/core/AI_OPERATION_PRINCIPLES.md](./rules/core/AI_OPERATION_PRINCIPLES.md)                |
| Task        | [@./rules/core/PRE_TASK_CHECK_SPEC.md](./rules/core/PRE_TASK_CHECK_SPEC.md)                        |
| Principles  | [@./rules/PRINCIPLES.md](./rules/PRINCIPLES.md)                                                    |
| Performance | [@./rules/development/PERFORMANCE.md](./rules/development/PERFORMANCE.md)                          |
| Failure     | [@./rules/development/FAILURE_PATTERNS.md](./rules/development/FAILURE_PATTERNS.md)                |
| Delete      | `mv [file] ~/.Trash/ && git add -A` (sandbox error → retry with `dangerouslyDisableSandbox: true`) |

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

References: [@./rules/workflows/WORKFLOW_GUIDE.md](./rules/workflows/WORKFLOW_GUIDE.md), [@./rules/conventions/DOCUMENTATION.md](./rules/conventions/DOCUMENTATION.md)
