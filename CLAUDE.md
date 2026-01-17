# CLAUDE.md

## Rules

| Rule       | Reference                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------- |
| Core       | [@./rules/core/AI_OPERATION_PRINCIPLES.md](./rules/core/AI_OPERATION_PRINCIPLES.md)                |
| Task       | [@./rules/core/PRE_TASK_CHECK_SPEC.md](./rules/core/PRE_TASK_CHECK_SPEC.md)                        |
| Principles | [@./rules/PRINCIPLES.md](./rules/PRINCIPLES.md)                                                    |
| Delete     | `mv [file] ~/.Trash/ && git add -A` (sandbox error → retry with `dangerouslyDisableSandbox: true`) |

## Development Checks

| Question              | Principle     |
| --------------------- | ------------- |
| Simpler way?          | Occam's Razor |
| <1 min to understand? | Miller's Law  |
| Duplicating?          | DRY           |
| Needed now?           | YAGNI         |

Skills auto-activate. Details: [@./skills/applying-code-principles/SKILL.md](./skills/applying-code-principles/SKILL.md)

## Completion

Before reporting: tests pass, build pass, lint pass

Never complete with: failing tests, build errors, unresolved errors

Command discovery: README.md → package.json → ask user

Commands: [@./rules/workflows/WORKFLOW_GUIDE.md](./rules/workflows/WORKFLOW_GUIDE.md)
Docs: [@./rules/conventions/DOCUMENTATION.md](./rules/conventions/DOCUMENTATION.md)

## Output

No bold (`**`). Use backticks for emphasis instead.
