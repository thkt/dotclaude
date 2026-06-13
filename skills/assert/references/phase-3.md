# Phase 3: Intent Assertion

After Phase 2a returns, the orchestrator (Claude Code) triages failing adversarial tests one by one. This phase has no parallel work; it runs after all of Phase 2 completes.

The output is a list of promoted adversarial findings (with `[adversarial]` source tag), passed to Phase 4.

## Triage Steps

| Step | Action                                        |
| ---- | --------------------------------------------- |
| 1    | Read the failing assertion description        |
| 2    | Read the target code (file:line ± 30 lines)   |
| 3    | Search for intent from § Intent Sources below |
| 4    | Apply verdict rules                           |

## Intent Sources

OUTCOME.md is the top-priority source because it defines what "done" looks like. Check in order from top.

| Source               | Search Pattern                                                            |
| -------------------- | ------------------------------------------------------------------------- |
| `.claude/OUTCOME.md` | Behavior / Non-goals / Constraints cached during Pre-flight               |
| SOW / Spec           | Under `.claude/workspace/planning/`; references from CLAUDE.md / SKILL.md |
| ADR                  | ADR directories such as `docs/decisions/`                                 |
| Commit message       | `git log` of the target file                                              |
| Code comments        | Comments within 10 lines of target code                                   |
| Function docstring   | JSDoc, rustdoc, docstring on the target function                          |
| README               | README.md in project root                                                 |
| Test names           | Existing test names for the same function                                 |

## Verdict Rules

| Condition                                                    | Verdict |
| ------------------------------------------------------------ | ------- |
| Intent source contradicts test expectation                   | exclude |
| Otherwise (no source found, or source confirms test correct) | promote |

## Exclusion Logging

Record excluded tests in the report using this format.

```markdown
### Excluded Adversarial Tests

| #   | Test             | Reason                                                                            |
| --- | ---------------- | --------------------------------------------------------------------------------- |
| 1   | test_null_throws | test encodes wrong expectation. Function returns null by design (line 42 comment) |
```

## Metrics

None of these affect the gate decision; they are recorded as informational only.

| Metric          | Formula                             | Recorded In            |
| --------------- | ----------------------------------- | ---------------------- |
| survival_rate   | `passed / (passed + promoted_fail)` | Evidence table         |
| exclusion_rate  | `excluded / total_fail`             | Report (informational) |
| generation_rate | `total_tests / scoped_files`        | Report (informational) |
