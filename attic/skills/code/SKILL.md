---
name: code
description: Implement code following TDD/RGRC cycle with real-time test feedback. Vertical slices only (one test then one impl, never bulk tests then bulk impl). Do NOT use for small bug fixes or error resolution (use /fix instead).
when_to_use: 実装して, コード書いて, implement, coding
allowed-tools: Bash(npm run) Bash(npm run:*) Bash(yarn run) Bash(yarn run:*) Bash(yarn:*) Bash(pnpm run) Bash(pnpm run:*) Bash(pnpm:*) Bash(bun run) Bash(bun run:*) Bash(bun:*) Bash(cargo:*) Bash(make:*) Bash(git status:*) Bash(git log:*) Bash(which:*) Edit MultiEdit Write Read LS Task AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[implementation description]"
---

# /code - TDD Implementation

Implement via the test-first RGRC cycle, leaving production code that satisfies each Spec Test Scenario (T-NNN) and passes the quality gates. When no Spec exists, still leave each change as test-verified code.

## Rationalization Counters

| Rationalization                    | Counter and action                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| This is too simple for TDD         | Simple changes hide regressions most. Write one test line first                                              |
| I'll add tests later               | Deferral compounds into debt. Write the test now, then implement                                             |
| This is just a refactor            | Untested refactors are the top cause of silent regressions. Confirm existing tests are green before starting |
| Existing tests already cover       | Don't assume. Run the Red phase to confirm coverage                                                          |
| Testing this would be too slow     | A slow test still beats a production bug. Write it anyway                                                    |
| Red test doesn't need verification | An unrun Red is blind. Run it; confirm the failure matches the intent                                        |

## Input

`$ARGUMENTS` contains the implementation description. Required; prompt the user if empty.

## SOW Context

See `${CLAUDE_SKILL_DIR}/../_lib/sow-resolution.md`

## Scope Guard

After reading OUTCOME.md and SOW, check (a) Phase file counts and (b) outcome alignment. If any Phase has Files ≥ 5, stop and ask user to split via `/think` before proceeding. If the implementation steps into Non-goals or conflicts with Constraints from OUTCOME.md, stop and confirm with user. If no SOW exists and `$ARGUMENTS` implies ≥ 5 files, suggest running `/think` first.

## Execution

When the RGRC cycle writes framework or library API code, follow the pinned version's official docs rather than memory. Apply `~/.claude/rules/development/SOURCING.md` to prevent version drift.

| Step | Action                 | Detail                                                                                                                        |
| ---- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 0    | Outcome Anchor         | Read `.claude/OUTCOME.md`; if absent, generate the stub via `/outcome`                                                        |
| 1    | SOW Context            | Detect and read SOW/spec → Scope Guard                                                                                        |
| 2    | Spawn `generator-test` | `subagent_type: generator-test`, `run_in_background: true`                                                                    |
| 3    | Receive test results   | `TaskOutput` (wait for completion before implementation)                                                                      |
| 4    | Test Review            | Spawn `reviewer-coverage`; resolve wrong assertions / weak or tautological / intent mismatches before implementing (advisory) |
| 5    | RGRC cycle             | gates auto-retry per Green. Meet the target (0 failures) paired with the preserved invariant (no test deleted/skipped)        |
| 6    | Review Gate            | Spawn `reviewer-readability`                                                                                                  |
| 7    | Storybook Phase        | Conditional. See `${CLAUDE_SKILL_DIR}/references/storybook-phase.md`                                                          |
| 8    | E2E Phase              | Conditional. See `${CLAUDE_SKILL_DIR}/references/e2e-phase.md`                                                                |
| 9    | Quality Gates          | See use-workflow-code. If a SOW exists, manually confirm AC are met                                                           |

## Spec Evolution

T-NNN is a `T-\d{3}` three-digit zero-padded spec scenario ID (e.g. `T-001`), embedded in the test function name, describe/it string, or inline comment.

When a new requirement surfaces during implementation (edge case, error handling, integration concern), update the Spec first, in this order.

1. Add T-NNN to the Test Scenarios table in spec.md
2. Write the test referencing that T-NNN in its name/comment

Every test maps to a T-NNN; never add a test without a Spec trace. `evaluator-test` uses these mappings to compute coverage and other quality metrics.

## Error Handling

| Error                                | Action                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| generator-test timeout               | Leader generates tests directly                                                  |
| generator-test produces 0 tests      | Verify spec exists, ask user                                                     |
| reviewer-coverage cannot launch      | Skip; Leader inspects the tests directly (advisory)                              |
| reviewer-readability cannot launch   | Skip; Leader reviews directly (advisory)                                         |
| Test runner not detected (non-JS/TS) | Re-spawn with the test runner specified in the task prompt                       |
| Quality gates fail                   | Fix issues before commit                                                         |
| Evaluator metric below threshold     | Fix uncovered/excess/duplicate/granularity/intent issues                         |
| Evaluator timeout                    | Skip gate, log warning                                                           |
| Spec not found                       | Proceed without T-NNN trace, skip Test Quality gate (or ask user to create spec) |
| agent-browser crash                  | Skip E2E, advisory, continue                                                     |
| Dev server unreachable               | Skip E2E, advisory, continue                                                     |
| E2E tests fail                       | Advisory (do not block)                                                          |
| Storybook phase error                | Skip phase, advisory, continue                                                   |
