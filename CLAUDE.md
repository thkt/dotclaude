# CLAUDE.md

## Rules

| Rule   | Directive                                                                          |
| ------ | ---------------------------------------------------------------------------------- |
| Core   | Safety First / Output Verifiability / User Authority                               |
| Task   | Run PREFLIGHT before implementation. Skip for questions / read-only / follow-up    |
| Commit | Commit only on explicit user request                                               |
| Scope  | Authorization applies to the specified action. Edit approval does not cover commit |

## Completion

| Task type     | Additional requirement                                                         |
| ------------- | ------------------------------------------------------------------------------ |
| Feature       | Add new tests. Existing tests passing is not enough                            |
| Fix           | Resolve the root cause. Symptom patches are not enough                         |
| Investigation | Understand the normal case. Identifying the bug alone is not enough            |
| No change     | Cite file:line showing the current state meets the goal. Confirm with the user |
