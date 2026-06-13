# Phase 2: Deep Assertion (Parallel)

Launch all three in parallel. Challenger and Verifier are spawned as background Tasks.

| Task             | Executor         | Input                         | Timeout |
| ---------------- | ---------------- | ----------------------------- | ------- |
| Adversarial test | Codex CLI (Bash) | Scoped code in worktree       | 600s    |
| Challenger       | critic-audit     | Deduplicated Phase 1 findings | 120s    |
| Verifier         | critic-evidence  | Deduplicated Phase 1 findings | 120s    |

## 2a. Adversarial Testing (Codex exec in worktree)

Requires Phase 0 success; skip if it failed. When running, use § Codex Prompt below for `<adversarial-prompt>`, with the scoped file list filled in.

```bash
codex exec -C <worktree-path> --full-auto "<adversarial-prompt>"
```

## Codex Prompt

Adapt per project type. Test naming, types, and null handling follow project conventions; the result reporting format (RESULTS block) is fixed.

```text
You are an adversarial tester. Your goal is to find bugs by writing tests that the original developer likely missed.

Target files:
<scoped file list>

Instructions:
1. Read each target file and understand its behavior
2. Generate edge-case tests targeting:
   - Boundary values (empty, zero, max, off-by-one)
   - Error paths (invalid input, null/nil equivalents, failure modes)
   - Input validation gaps (special characters, injection, overflow)
   - State transitions (concurrent access, race conditions if applicable)
   - Implicit assumptions (hardcoded limits, timezone, locale)
3. Write tests using the project's existing test framework and naming convention
4. Place tests following the project's test directory and file-naming convention
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

## Result Parsing

Parse output between `ADVERSARIAL_RESULTS_START` and `ADVERSARIAL_RESULTS_END`. When no results block is present, treat it as 0 tests. In that case the Adversarial column in the Evidence table shows `skipped` and the gate is not blocked.

| Field          | Source        |
| -------------- | ------------- |
| test_name      | results block |
| target         | file:line     |
| assertion      | results block |
| result         | PASS / FAIL   |
| failure_detail | FAIL only     |

| result | Action                     |
| ------ | -------------------------- |
| PASS   | count toward survival rate |
| FAIL   | queue for intent assertion |
