# Adversarial Testing Protocol

Codex generates edge-case tests in an isolated worktree, runs them, and reports
results. Failing tests go through intent verification before becoming findings.

## Prerequisites

- Successful worktree bootstrap (Phase 0)
- Scoped file list from mode selection

## Codex Prompt

Adapt per project type.

```
You are an adversarial tester. Your goal is to find bugs by writing tests that
the original developer likely missed.

Target files:
<scoped file list>

Instructions:
1. Read each target file and understand its behavior
2. Generate edge-case tests targeting:
   - Boundary values (empty, zero, max, off-by-one)
   - Error paths (null, undefined, invalid types, network failure)
   - Input validation gaps (special characters, injection, overflow)
   - State transitions (concurrent access, race conditions if applicable)
   - Implicit assumptions (hardcoded limits, timezone, locale)
3. Write tests using the project's existing test framework
4. Place tests in a file named `adversarial.test.<ext>` in the project test directory
5. Run the tests
6. Report results in this exact format:

ADVERSARIAL_RESULTS_START
test_name: <name>
target: <file:line being tested>
assertion: <what the test asserts>
result: PASS | FAIL
failure_detail: <error message if FAIL>
---
(repeat for each test)
ADVERSARIAL_RESULTS_END
```

## Timeout

600 seconds. On timeout: skip adversarial testing, log reason in report.

## Result Parsing

Parse output between `ADVERSARIAL_RESULTS_START` and `ADVERSARIAL_RESULTS_END`.

| Field          | Source        |
| -------------- | ------------- |
| test_name      | results block |
| target         | file:line     |
| assertion      | results block |
| result         | PASS / FAIL   |
| failure_detail | FAIL only     |

| result | Action                        |
| ------ | ----------------------------- |
| PASS   | count toward survival rate    |
| FAIL   | queue for intent verification |

No results block: treat as 0 tests (adversarial score = 15, neutral).

## Intent Verification (Phase 2.5 — Orchestrator)

The following steps are executed by the orchestrator (Claude Code), not by Codex.
The orchestrator triages each failing adversarial test.

### Triage Steps

| Step | Action                                                     |
| ---- | ---------------------------------------------------------- |
| 1    | Read the failing assertion description                     |
| 2    | Read the target code (file:line ± 30 lines context)        |
| 3    | Search for intent documentation (see Intent Sources below) |
| 4    | Apply verdict rules                                        |

### Intent Sources (check in order)

| Source             | Search Pattern                                   |
| ------------------ | ------------------------------------------------ |
| Code comments      | Comments within 10 lines of target code          |
| Function docstring | JSDoc, rustdoc, docstring on the target function |
| Spec               | SOW/Spec referenced in SKILL.md or CLAUDE.md     |
| README             | README.md in project root                        |
| Test names         | Existing test descriptions for the same function |

### Verdict Rules

| Condition                                         | Verdict | Confidence |
| ------------------------------------------------- | ------- | ---------- |
| Intent source contradicts test expectation        | exclude | —          |
| Intent source confirms test is correct            | promote | 0.85+      |
| No intent source found, behavior is clearly a bug | promote | 0.80       |
| No intent source found, behavior is ambiguous     | promote | 0.70       |

### Exclusion Logging

```markdown
### Excluded Adversarial Tests

| # | Test | Reason |
| 1 | test_null_throws | test encodes wrong expectation — function returns null by design (line 42 comment) |
```

## Metrics

| Metric          | Formula                           | Used In       |
| --------------- | --------------------------------- | ------------- |
| survival_rate   | passed / (passed + promoted_fail) | Trust Score   |
| exclusion_rate  | excluded / total_fail             | Report (info) |
| generation_rate | total_tests / scoped_files        | Report (info) |
