# PREFLIGHT

Confirm scope before implementation. Skip for questions / read-only / follow-up edits to same files / same-session plan continuation.

## Outcome Reference

Read `.claude/OUTCOME.md` at task start and judge scope against the outcome. See rules/core/OUTCOME.md for the rule definition. Skip only for questions, read-only operations, or when OUTCOME.md was already read earlier in this session.

| Condition                             | Action                                                             |
| ------------------------------------- | ------------------------------------------------------------------ |
| OUTCOME.md absent                     | Generate stub via the workflow (see rules/core/OUTCOME.md)         |
| Change requested in a non-goal area   | Confirm with user: redefine non-goal or split into a separate task |
| Change conflicts with Constraints     | Stop. Confirm with user whether the constraint should change       |
| Change does not advance outcome state | Re-check YAGNI                                                     |

## Rationalization Counters

| Excuse                                | Counter                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| "This is a simple follow-up"          | Scope changes disguise as follow-ups. Check scope at minimum                   |
| "I already understand the codebase"   | Understanding is not verification. When did you last read the target files?    |
| "The user wants speed over process"   | Scope check takes 30 seconds. Wrong-scope implementation takes hours           |
| "This is covered by the plan"         | Plans describe intent. Scope check verifies current state                      |
| "Root fix is too costly for the user" | Cost judgment is the user's. Present options with costs and let them decide    |
| "I can write this from scratch"       | Adjacent code may already do it. Search the target module for duplicates first |

## Task Decomposition

Split when any threshold is exceeded.

| Condition | Threshold |
| --------- | --------- |
| Files     | ≥5        |
| Features  | ≥3        |
| Layers    | ≥3        |
| Lines     | ≥200      |

## Interpretation Clarity

| Trigger                               | Action                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Multiple valid interpretations exist  | List all. Do not silently pick one. Wait for confirmation                     |
| Task intent is unclear                | Stop. Name what is unclear. Do not proceed                                    |
| Issue URL or external spec referenced | Present plan (changes, files, TODO) and wait for approval before implementing |
