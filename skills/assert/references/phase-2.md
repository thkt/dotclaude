# Phase 2: Deep Assertion (Parallel)

Launch all three in parallel. Challenger and Verifier are spawned as background Tasks.

| Task             | Executor         | Input                         | Timeout |
| ---------------- | ---------------- | ----------------------------- | ------- |
| Adversarial test | Codex CLI (Bash) | Scoped code in worktree       | 600s    |
| Challenger       | critic-audit     | Deduplicated Phase 1 findings | 120s    |
| Verifier         | critic-evidence  | Deduplicated Phase 1 findings | 120s    |

## 2a. Adversarial Testing

Requires Phase 0 success; skip if it failed. Use § Codex Prompt below for `<adversarial-prompt>`, with the scoped file list filled in. The flags are the same as `${CLAUDE_SKILL_DIR}/references/phase-1.md` § 1c. Test Execution. Run the command below in the worktree.

```bash
codex exec -c sandbox_workspace_write.network_access=true -C <worktree-path> --full-auto "<adversarial-prompt>" </dev/null
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

Pass the codex background output-file directly to `${CLAUDE_SKILL_DIR}/scripts/parse-adversarial.py` (do not re-redirect to `$TMPDIR`).

```bash
"${CLAUDE_SKILL_DIR}/scripts/parse-adversarial.py" <codex-output-file> --scoped-files <N>
```

The script returns JSON {tests, total, passed, failed, generation_rate, survival_rate}. When total=0, show `skipped` in the Adversarial column of the Evidence table and do not block the gate. survival_rate is computed when the script is re-run with `--promoted <N>` after Phase 3 triage (`${CLAUDE_SKILL_DIR}/references/phase-3.md` § Metrics).

Each test's fields (test_name / target / assertion / result / failure_detail) land in the JSON `tests` array. The `result` value routes as below.

| result | Action                     |
| ------ | -------------------------- |
| PASS   | count toward survival rate |
| FAIL   | queue for intent assertion |
