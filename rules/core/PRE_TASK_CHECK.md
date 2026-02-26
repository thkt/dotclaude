# PRE_TASK_CHECK

Confirm scope before implementation. Skip for questions, read-only, follow-up
edits to same file(s), or same-session plan continuation.

## Rationalization Counters

| Excuse                              | Counter                                                                |
| ----------------------------------- | ---------------------------------------------------------------------- |
| "This is a simple follow-up"        | Scope changes disguise as follow-ups. Check scope at minimum           |
| "I already understand the codebase" | Understanding ≠ verification. When did you last read the target files? |
| "The user wants speed over process" | Scope check takes 30 seconds. Wrong-scope implementation takes hours   |
| "This is covered by the plan"       | Plans describe intent. Scope check verifies current state              |

## Task Decomposition

Split when ANY threshold exceeded:

| Condition | Threshold |
| --------- | --------- |
| Files     | ≥5        |
| Features  | ≥3        |
| Layers    | ≥3        |
| Lines     | ≥200      |

## Done Definition

| Type          | Criteria                                                              |
| ------------- | --------------------------------------------------------------------- |
| Feature       | Functionality works, no regression, tests added                       |
| Fix           | Issue no longer reproduces, root cause resolved                       |
| Refactor      | Behavior unchanged (tests pass), quality improved (measurable)        |
| Investigation | Reproduction confirmed, root cause identified, normal case understood |

## No Change Rule

Before reporting no change: cite specific file:line showing current state meets
goal, then confirm with user.
