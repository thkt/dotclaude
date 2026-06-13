---
name: assert
description: Independent outcome-based assertion with Codex + audit reviewers. Emits ternary Ready / Ready (caveat) / NotReady gate from reconciled static + dynamic evidence. Do NOT use for quick code review (use /polish) or static-only audit (use /audit).
when_to_use: 検証して, assert, 独立検証, outcome assertion, gate decision, adversarial testing
allowed-tools: Bash(codex:*) Bash(git worktree:*) Bash(git diff:*) Bash(git status:*) Bash(git log:*) Bash(git branch:*) Bash(git ls-files:*) Bash(npm ci:*) Bash(npm run:*) Bash(npm test:*) Bash(cargo:*) Bash(make:*) Bash(bun:*) Bash(pnpm:*) Bash(yarn:*) Bash(which:*) Bash(date:*) Read Write LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*) Bash($HOME/.claude/skills/assert/scripts/*)
model: opus
argument-hint: "[file paths or directory for target mode] [--base <branch>]"
---

# /assert - Independent Outcome-Based Assertion

Codex asserts independently in an isolated worktree. Claude Code orchestrates and synthesizes. Emits a ternary Gate decision (Ready / Ready (caveat) / NotReady) from reconciled static + dynamic evidence.

## Input and Mode

Use `--base <branch>` as the base branch when given, otherwise `main`. Scope is determined from `$ARGUMENTS` per the table below.

| `$ARGUMENTS`                          | Mode   | Scope                                                                          |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| file path                             | target | The single file (regardless of git tracking state)                             |
| directory                             | target | `git ls-files <path>` output (recursive, `.gitignore` respected, tracked only) |
| omitted, uncommitted changes exist    | diff   | Changed files (uncommitted)                                                    |
| omitted, commits ahead of base branch | diff   | Changed files (branch diff)                                                    |
| omitted, no changes                   | -      | Abort                                                                          |

## Pre-flight

Outcome-based assertion needs the outcome it is asserting against. Read `.claude/OUTCOME.md` before Phase 0 to establish what "done" means for the repo.

| Condition                             | Action                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `.claude/OUTCOME.md` exists           | Read and cache the Behavior / Non-goals / Constraints sections              |
| `.claude/OUTCOME.md` absent           | Generate stub via /outcome, then proceed                                    |
| Behavior empty or all sections TBD    | Treat as absent. Run /outcome                                               |
| Asserted change touches a Non-goal    | Flag in report as Intent Assertion finding; let Phase 4 decide if it blocks |
| Asserted change violates a Constraint | Promote as `[adversarial]` finding (Issues>0 routes to NotReady)            |

## Phases

Phases whose Mode column is `parallel (required)` issue all Task / Bash / Codex exec calls concurrently within a single response (sequential invocation negates the fan-out and doubles wall time).

| Phase | Action              | Executor                   | Mode                | Depends On | Detail                                              |
| ----- | ------------------- | -------------------------- | ------------------- | ---------- | --------------------------------------------------- |
| pre   | OUTCOME.md read     | orchestrator (Read)        | sequential          | -          | Pre-flight section above                            |
| 0     | Bootstrap worktree  | orchestrator (Bash)        | sequential          | pre        | ${CLAUDE_SKILL_DIR}/references/phase-0.md           |
| 1     | Evidence collection | Codex CLI + audit agents   | parallel (required) | Phase 0    | ${CLAUDE_SKILL_DIR}/references/phase-1.md           |
| 2     | Deep assertion      | Codex CLI + audit agents   | parallel (required) | Phase 1    | ${CLAUDE_SKILL_DIR}/references/phase-2.md           |
| 3     | Intent assertion    | orchestrator (Claude Code) | sequential          | Phase 2    | ${CLAUDE_SKILL_DIR}/references/phase-3.md           |
| 4     | Evidence synthesis  | enhancer-evidence          | single task         | Phase 3    | ${CLAUDE_SKILL_DIR}/references/phase-4.md           |
| final | Worktree cleanup    | orchestrator (Bash)        | sequential          | Always     | ${CLAUDE_SKILL_DIR}/references/phase-0.md § Cleanup |

## Report

The leader does not generate the gate itself; it decodes the JSON decision block returned by enhancer-evidence and relays it verbatim. The template is `${CLAUDE_SKILL_DIR}/templates/report.md`. All gate-related rules are consolidated in `${CLAUDE_SKILL_DIR}/references/phase-4.md`.

| Looking for                                        | Section in phase-4.md        |
| -------------------------------------------------- | ---------------------------- |
| Ready / Ready (caveat) / NotReady decision rule    | § Gate Rule                  |
| JSON decision block decode procedure               | § Gate Decode                |
| Gate routing on bootstrap failure                  | § Bootstrap Failure Handling |
| When to state `gate = Ready` in completion message | § /goal Integration          |

## Error Handling

| Error                            | Recovery                                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| codex not installed              | Print install instructions, abort                                                                                                  |
| Bootstrap fail / env             | Skip Phase 1c + 2a, continue static-only. Gate routing is `${CLAUDE_SKILL_DIR}/references/phase-4.md` § Bootstrap Failure Handling |
| Bootstrap fail / build smoke     | Skip Phase 1c + 2a. Gate routing is `${CLAUDE_SKILL_DIR}/references/phase-4.md` § Bootstrap Failure Handling                       |
| Bootstrap timeout (780s overall) | Treat as build smoke fail if the build had started; otherwise as env fail                                                          |
| Codex review fails               | Log error, proceed with audit reviewers only                                                                                       |
| Codex exec timeout (600s)        | Skip that phase, log in report                                                                                                     |
| Reviewer stall (120s)            | Proceed without, log warning                                                                                                       |
| Challenger stall                 | Proceed with verifier only                                                                                                         |
| Verifier stall                   | Proceed with challenger only                                                                                                       |
| Integrator stall                 | Leader synthesizes manually (simplified report)                                                                                    |
| Worktree cleanup fails           | Log warning, suggest manual cleanup                                                                                                |

## Escalation

| Condition                                       | Action                                                                                  |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| Any issue (challenger / verifier / adversarial) | Block merge, suggest `/fix`                                                             |
| Architectural root causes found                 | Suggest `/think` for design review                                                      |
| Adversarial tests reveal coverage gap           | Suggest `/code` to add tests                                                            |
| `gate = Ready (caveat)`                         | Re-run /assert after restoring environment (or accept dynamic-evidence gap consciously) |

## Completion Criteria

End only when all of the following hold. Record the reason in the report for any item that cannot be met.

| Item      | Criterion                                        |
| --------- | ------------------------------------------------ |
| Mode      | Detected target / diff                           |
| Bootstrap | Attempted (success or failure reflected in gate) |
| Phase 1   | Collected static + dynamic evidence              |
| Phase 2   | Ran challenger / verifier                        |
| Phase 4   | Decoded the enhancer-evidence JSON decision      |
| Gate      | Displayed the ternary gate                       |
| Worktree  | Cleaned up (on failure, present manual steps)    |
