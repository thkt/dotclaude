# CLAUDE.md

## Rules

| Rule   | Directive                                                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core   | Safety First, Output Verifiability, User Authority                                                                                                               |
| Task   | PRE_TASK_CHECK before implementation (skip for questions, read-only, follow-up)                                                                                  |
| Delete | `mv [file] ~/.Trash/ && git add [file]` (if sandbox blocks `mv ~/.Trash/` → retry with `dangerouslyDisableSandbox: true`, other sandbox errors → report to user) |
| Plan   | Do NOT use EnterPlanMode. For planning, suggest `/think`. For implementation, show PRE_TASK_CHECK.                                                               |

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
