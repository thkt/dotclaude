# Phase Details

Detailed execution of each assert phase. SKILL.md references this per phase.

## Phase 1: Evidence Collection (Parallel)

Launch all three in parallel via Task (background). Proceed to Phase 2 after all complete.

| Task            | Executor           | Action                                                            |
| --------------- | ------------------ | ----------------------------------------------------------------- |
| Codex review    | Codex CLI (Bash)   | Static review of changed/target code                              |
| Audit reviewers | Claude Code agents | Domain-specific static analysis                                   |
| Test execution  | Codex CLI (Bash)   | Test command in worktree (build reused from bootstrap smoke test) |

### 1a. Codex Static Review

| Mode               | Command                                                           |
| ------------------ | ----------------------------------------------------------------- |
| diff (uncommitted) | `codex review --uncommitted`                                      |
| diff (branch)      | `codex review --base $BASE`                                       |
| target             | `codex review --uncommitted` (after copying target files context) |

| Codex severity | Normalized |
| -------------- | ---------- |
| `[P1]`         | high       |
| `[P2]`         | medium     |
| `[P3]`         | drop       |

Skip findings without file:line or outside scope.

### 1b. Audit Reviewers

Use /audit file routing table (`skills/audit/SKILL.md` § File Routing). Apply same reviewer assignments per file type.

Each reviewer spawned as standalone background Task.

| Constraint   | Value                               |
| ------------ | ----------------------------------- |
| Input        | Assigned file list + finding-schema |
| Max parallel | 10 (batch if more)                  |
| Timeout      | 120s per reviewer                   |

### 1c. Test Execution (Codex exec in worktree)

Requires Phase 0 success. Skip if failed. Build is NOT re-run here; the orchestrator reuses the bootstrap smoke test result (Step 4) for the Build column in the Evidence table.

```bash
codex exec -C <worktree-path> "Run the project test command. \
Report: (1) test exit code and last 50 lines of stderr if non-zero, \
(2) test summary (total/passed/failed)."
```

| Constraint | Value                                                          |
| ---------- | -------------------------------------------------------------- |
| Timeout    | 600s                                                           |
| Captures   | test pass/fail (with stderr). Build value comes from bootstrap |

## Phase 1→2 Transition: Finding Deduplication

1. Deduplicate by `file:line` across Codex and reviewer findings (category schemas differ between sources, so category is not part of the dedup key)
2. On collision: keep highest severity, retain ALL source tags as a list (e.g. `[codex, reviewer-security]`) for tracability
3. Pass deduplicated set with multi-source tags to Phase 2 challenger and verifier

## Phase 2: Deep Assertion (Parallel)

Launch all three in parallel.

| Task             | Executor         | Input                         |
| ---------------- | ---------------- | ----------------------------- |
| Adversarial test | Codex CLI (Bash) | Scoped code in worktree       |
| Challenger       | critic-audit     | Deduplicated Phase 1 findings |
| Verifier         | critic-evidence  | Deduplicated Phase 1 findings |

### 2a. Adversarial Testing (Codex exec in worktree)

Requires Phase 0 success. Skip if failed.

```bash
codex exec -C <worktree-path> --full-auto "<adversarial-prompt>"
```

`<adversarial-prompt>`: ${CLAUDE_SKILL_DIR}/references/adversarial.md § Codex Prompt (fill in scoped file list).

| Constraint | Value |
| ---------- | ----- |
| Timeout    | 600s  |

### 2b. Challenger + Verifier

| Task       | subagent_type   | Input                         |
| ---------- | --------------- | ----------------------------- |
| Challenger | critic-audit    | Deduplicated Phase 1 findings |
| Verifier   | critic-evidence | Deduplicated Phase 1 findings |

120s timeout each. Background Tasks.

## Phase 3: Intent Assertion

After Phase 2a returns, orchestrator (Claude Code) triages failing adversarial tests sequentially. This phase has no parallel work; it runs after Phase 2 completes.

${CLAUDE_SKILL_DIR}/references/adversarial.md § Intent Assertion verdict rules: assertion + target code → search intent sources → verdict (exclude if intent source contradicts; otherwise promote).

Intent sources include (in priority order): `.claude/OUTCOME.md` (Behavior / Non-goals / Constraints from Pre-flight), SOW / Spec under `.claude/workspace/planning/`, ADRs, target file commit messages, code comments. OUTCOME.md is the top-priority source because it defines what "done" looks like; a failing assertion that contradicts a Non-goal or violates a Constraint is promoted regardless of test contents.

Output: list of promoted adversarial findings (with `[adversarial]` source tag), passed to Phase 4.

## Phase 4: Evidence Synthesis

Spawn `enhancer-evidence` as a single background Task.

| Input               | Source                                                                             |
| ------------------- | ---------------------------------------------------------------------------------- |
| Outcome reference   | `.claude/OUTCOME.md` Behavior / Non-goals / Constraints (cached during Pre-flight) |
| Challenger output   | Raw challenger output (enhancer-evidence reconciles internally)                    |
| Verifier output     | Raw verifier output (enhancer-evidence reconciles internally)                      |
| Outcome evidence    | Bootstrap smoke test (build) + Phase 1c (test) results                             |
| Adversarial results | Phase 3 promoted findings (merged into issues set with `[adversarial]` source tag) |

Integrator constructs a single `issues` set: dedup by `file:line`, retain ALL source tags per finding (e.g. `[challenger, adversarial]`). Findings that the Outcome reference contradicts (touching a Non-goal or violating a Constraint) carry full weight in the issues count. The unified set drives gate evaluation in ${CLAUDE_SKILL_DIR}/references/gate-decision.md § Gate Rule.

Returns: root causes + Gate decision (Ready / Ready (caveat) / NotReady) + report.

## Cleanup (Always)

Wrap all phases in try/finally to guarantee cleanup regardless of outcome.

```bash
git worktree remove <worktree-path> --force
git branch -D assert-<session-id>
```
