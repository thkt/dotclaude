---
name: assert
description: Independent outcome-based assertion with Codex + audit reviewers. Emits ternary Ready / Ready (caveat) / NotReady gate from reconciled static + dynamic evidence. Do NOT use for quick code review (use /polish) or static-only audit (use /audit).
when_to_use: 検証して, assert, 独立検証, outcome assertion, gate decision, adversarial testing
allowed-tools: Bash(codex:*) Bash(git worktree:*) Bash(git diff:*) Bash(git status:*) Bash(git log:*) Bash(git branch:*) Bash(git ls-files:*) Bash(npm ci:*) Bash(npm run:*) Bash(npm test:*) Bash(cargo:*) Bash(make:*) Bash(bun:*) Bash(pnpm:*) Bash(yarn:*) Bash(which:*) Bash(date:*) Bash(rm:*) Read Write LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[file paths or directory for target mode] [--base <branch>]"
---

# /assert - Independent Outcome-Based Assertion

Codex asserts independently in an isolated worktree. Claude Code orchestrates and synthesizes. Emits a ternary Gate decision (Ready / Ready (caveat) / NotReady) from reconciled static + dynamic evidence. No numeric score.

## Rationalization Counters

| Excuse                               | Counter                                                        |
| ------------------------------------ | -------------------------------------------------------------- |
| "Tests pass, so the code is correct" | Your tests, your environment. Independent assertion is the gap |
| "Codex will just find the same bugs" | Different model = different blind spots. That is the value     |
| "Adversarial testing takes too long" | Skip it if it does. Gate falls back to static-only mode        |
| "The code review already covered it" | Reviews read code. Assertion runs code. Different evidence     |

## Input

| Arg               | Value                   | Result                    |
| ----------------- | ----------------------- | ------------------------- |
| `$ARGUMENTS`      | file path or directory  | `target` mode             |
| `$ARGUMENTS`      | omitted (changes exist) | `diff` mode (auto-detect) |
| `--base <branch>` | base branch override    | overrides default `main`  |

## Mode Selection

| Condition                                     | Mode   | Scope                                                                          |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `$ARGUMENTS` is a file path                   | target | The single file (regardless of git tracking state)                             |
| `$ARGUMENTS` is a directory                   | target | `git ls-files <path>` output (recursive, `.gitignore` respected, tracked only) |
| No `$ARGUMENTS`, uncommitted changes exist    | diff   | Changed files (uncommitted)                                                    |
| No `$ARGUMENTS`, commits ahead of base branch | diff   | Changed files (branch diff)                                                    |
| No `$ARGUMENTS`, no changes                   | -      | Abort: "Nothing to assert"                                                     |

Base branch detection: `main` (default), override with `--base <branch>`. Directory scope uses `git ls-files` to delegate `.gitignore` parsing to git itself; untracked files inside a directory are excluded by design (use diff mode to assert uncommitted work).

## Execution

| Phase | Action              | Executor                   | Mode                | Depends On | Detail                                                    |
| ----- | ------------------- | -------------------------- | ------------------- | ---------- | --------------------------------------------------------- |
| 0     | Bootstrap worktree  | orchestrator (Bash)        | sequential          | -          | ${CLAUDE_SKILL_DIR}/references/bootstrap.md               |
| 1     | Evidence collection | Codex CLI + audit agents   | parallel (required) | Phase 0    | ${CLAUDE_SKILL_DIR}/references/phase-details.md § Phase 1 |
| 2     | Deep assertion      | Codex CLI + audit agents   | parallel (required) | Phase 1    | ${CLAUDE_SKILL_DIR}/references/phase-details.md § Phase 2 |
| 3     | Intent assertion    | orchestrator (Claude Code) | sequential          | Phase 2    | ${CLAUDE_SKILL_DIR}/references/phase-details.md § Phase 3 |
| 4     | Evidence synthesis  | enhancer-evidence          | single task         | Phase 3    | ${CLAUDE_SKILL_DIR}/references/phase-details.md § Phase 4 |
| final | Worktree cleanup    | orchestrator (Bash)        | sequential          | Always     | ${CLAUDE_SKILL_DIR}/references/phase-details.md § Cleanup |

Phase 0 constraints: Timeout 300s overall. Bootstrap includes a build smoke test as fast-fail guard.

- Step 1-3 fail (env: worktree, install): skip Phase 1c, 2a → gate = Ready (caveat) when Issues=0, NotReady when Issues>0
- Step 4 fail (build smoke broken): skip Phase 1c, 2a → gate = NotReady (Build = fail blocks regardless of Issues)

Both paths log the failure reason in the report.

Parallel mode rule: phases marked `parallel (required)` must issue all Task / Bash / Codex exec calls concurrently within a single response. Sequential invocation negates the fan-out and doubles wall time.

External dependencies: Phase 1b reviewer file routing follows the /audit skill's File Routing table. Changes there affect /assert reviewer assignment.

## Report

Gate rule canonical is ${CLAUDE_SKILL_DIR}/references/gate-decision.md.

```markdown
## Assertion Report

| Field     | Value                                     |
| --------- | ----------------------------------------- |
| gate      | Ready / Ready (caveat) / NotReady         |
| mode      | diff (main) / diff (uncommitted) / target |
| scope     | {file count} files                        |
| bootstrap | success / failed: {reason}                |

### Gate Decision

| Check       | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Build       | pass / fail / skipped                                                |
| Tests       | pass / fail (N passed, M failed) / skipped / no-runner               |
| Issues      | 0 / N total (X from challenger, Y from verifier, Z from adversarial) |
| Adversarial | N/M passed / skipped                                                 |

`Ready (caveat)` row appears when bootstrap failed but Issues = 0; `caveat: dynamic evidence skipped` is appended.

### Blockers

[All issues + build/test failures with Fix suggestions and source tag (challenger / verifier / adversarial)]

Empty: `(none)` when gate = Ready.

### Root Causes

[RC-001... with description, category, findings, action]

### Issues

[High / Medium severity tables with Source tag, File:Line, Description, Evidence. Multi-source detections show all tags, e.g. `[challenger, adversarial]`.]

### Adversarial Test Results

[test name, target, result, verdict per test]

### Outcome Evidence

[build/test pass/fail with stderr excerpts]

### Diff from previous

[Resolved / New / Carried from workspace/history/.]

`<promise>PASS</promise>` is emitted by enhancer-evidence when gate = Ready ONLY (NOT for Ready (caveat) or NotReady). Leader relays verbatim without regenerating.
```

## Error Handling

| Error                                  | Recovery                                                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| codex not installed                    | Print install instructions, abort                                                                                     |
| Bootstrap fail at Step 1-3 (env)       | Skip Phase 1c + 2a → static-only mode. Build = `skipped`. gate = Ready (caveat) when issues=0, NotReady when issues>0 |
| Bootstrap fail at Step 4 (build smoke) | Build = `fail` (not skipped). Skip Phase 1c + 2a. gate = NotReady (build fail blocks regardless of issues count)      |
| Bootstrap timeout (300s overall)       | Treat as Step 1-3 fail unless Step 4 had started; then treat as Step 4 fail                                           |
| Codex review fails                     | Log error, proceed with audit reviewers only                                                                          |
| Codex exec timeout (600s)              | Skip that phase, log in report                                                                                        |
| Reviewer stall (120s)                  | Proceed without, log warning                                                                                          |
| Challenger stall                       | Proceed with verifier only                                                                                            |
| Verifier stall                         | Proceed with challenger only                                                                                          |
| Integrator stall                       | Leader synthesizes manually (simplified report)                                                                       |
| No issues from any source              | gate = Ready (or Ready (caveat) when bootstrap failed). Note "no issues found"                                        |
| Worktree cleanup fails                 | Log warning, suggest manual cleanup                                                                                   |

## Escalation

| Condition                                       | Action                                                                                  |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| Any issue (challenger / verifier / adversarial) | Block merge, suggest `/fix`                                                             |
| Architectural root causes found                 | Suggest `/think` for design review                                                      |
| Adversarial tests reveal coverage gap           | Suggest `/code` to add tests                                                            |
| gate = Ready (caveat)                           | Re-run /assert after restoring environment (or accept dynamic-evidence gap consciously) |

## Assertion

| Check                            | Required |
| -------------------------------- | -------- |
| Mode detected?                   | Yes      |
| Bootstrap attempted?             | Yes      |
| Phase 1 produced evidence?       | Yes      |
| Phase 2 challenger/verifier ran? | Yes      |
| Integrator produced report?      | Yes      |
| Gate decision displayed?         | Yes      |
| Worktree cleaned up?             | Yes      |
