# CLAUDE.md

## Rules

| Rule   | Directive                                                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core   | Safety First, Output Verifiability, User Authority                                                                                                               |
| Task   | PRE_TASK_CHECK before implementation (skip for questions, read-only, follow-up)                                                                                  |
| Delete | `mv [file] ~/.Trash/ && git add [file]` (if sandbox blocks `mv ~/.Trash/` → retry with `dangerouslyDisableSandbox: true`, other sandbox errors → report to user) |
| Commit | Only when user explicitly requests. Never auto-commit after edits                                                                                                |
| Scope  | Do not extend authorization scope. Edit approval ≠ commit approval                                                                                               |
| Plan   | Do NOT use EnterPlanMode. For planning, suggest `/think`.                                                                                                        |

## Completion

| Condition     | Requirements                                      |
| ------------- | ------------------------------------------------- |
| Before report | tests pass, build pass, lint pass                 |
| Never report  | failing tests, build errors, unresolved           |
| Feature       | new tests added (not just existing tests passing) |
| Fix           | root cause resolved (not just symptom patched)    |
| Investigation | normal case understood, not just bug identified   |

| Discovery | Order                               |
| --------- | ----------------------------------- |
| Commands  | README.md → package.json → ask user |
