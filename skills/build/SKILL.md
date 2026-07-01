---
name: build
description: Comprehensive implementation orchestrator chaining challenge / checkout / research / think / code / quality / commit / pr. Runs end-to-end from GO/NO-GO premise verification through branch creation, design, TDD implementation, a quality layer stacking internal audit and external polish (Codex + cleanup), commit, and PR creation. Use for any work spanning planning to implementation: new features, refactoring, migrations. Do NOT use for a single planned implementation (use /code). Do NOT use for bug fixes (use /fix). Do NOT use for planning only without implementation (use /think).
when_to_use: 一気通貫で実装, 新機能, 計画を要するリファクタリング, 大規模マイグレーション, build, end-to-end implementation
allowed-tools: Skill Workflow Bash(npm run) Bash(npm run:*) Bash(npm test:*) Bash(yarn run) Bash(yarn run:*) Bash(pnpm run) Bash(pnpm run:*) Bash(bun run) Bash(bun run:*) Bash(make:*) Bash(git diff:*) Bash(git status:*) Bash(git log:*) Bash(git show:*) Bash(git ls-files:*) Bash(git worktree *) Bash(git merge *) Bash(git branch *) Bash(date:*) Bash(mkdir:*) Edit MultiEdit Write Read LS Task TaskCreate TaskList TaskUpdate AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[implementation task]"
---

# /build - Implementation Orchestrator

Chains `/challenge` → `/checkout` → `/research` → `/think` → `/code` → quality → `/commit` → `/pr`, running end-to-end from premise GO verification through committing test-verified implementation to PR creation. Covers not just new features but refactoring and migrations. For tasks that clear the Phase 2 scope gate, every machinery phase must run through a Skill dispatch.

## Dispatch, not inline

This orchestrator's core value lives in the critic-design / reviewer agents / external Codex that each sub-skill spawns. Those cannot be reproduced inside build's own conversation context. Running a machinery phase's work inline means `Skill(X)` never fires and adversarial coverage drops to zero. The critic-design attack on think's SOW/Spec, audit's reviewer swarm, and polish's external Codex all get skipped, and the implementation reaches commit on the orchestrator's own self-assessment alone. That defeats the reason build was invoked.

| Phase group                                  | Handling                                                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| challenge / research / think / code / polish | Always call `Skill(X)` and wait for its return before the next phase. Inline substitution is forbidden (it bypasses the machinery) |
| audit                                        | Always call `Workflow({name:"audit"})`. A deterministic script owns the fan-out, so inline substitution is forbidden               |
| checkout / commit / pr                       | Thin wrappers. Inline and dispatch yield the same result. Dispatch is optional                                                     |

## Input

Take the implementation task from `$ARGUMENTS` (optional). If empty, ask the user what to implement via AskUserQuestion.

## Phase 1: PREFLIGHT

1. Context-scan CLAUDE.md, package.json, Cargo.toml, etc.
2. Run PREFLIGHT
3. Resolve inferences and unknowns
4. Track with TaskCreate (Phase 2-9)

## Phase 2: challenge + scope gate

Run `Skill("challenge", $ARGUMENTS)` to verify the implementation premise as GO / NO-GO. This phase carries both premise verification and scope sizing.

| challenge result                                                                       | routing                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NO-GO                                                                                  | Present the refuting evidence and stop                                                                                                                                                   |
| GO and single-file / single-concern with empty decisions (no design decision survives) | Full build is disproportionate. Propose switching to /code (planned single implementation) or /fix (bug) via AskUserQuestion; on the user's choice, delegate to that skill and end build |
| GO and involves design decisions or multiple layers                                    | Continue to the full chain from Phase 3. Pass Verdict / decisions / trade-offs / Actionable items into Phase 5 (think)                                                                   |

## Phase 3: Branch

Run `Skill("checkout", $ARGUMENTS)` to create the working branch. A thin wrapper, so inline is fine. At the start the diff is empty, so naming leans mainly on `$ARGUMENTS`. Skip if already off the default branch.

## Phase 4: research

Run `Skill("research", $ARGUMENTS)`. A machinery phase, so dispatch is required. Substituting the research inline skips the advisor pass and the subagent swarm. Skip when there are no unknowns, but dispatch when you do run it. Output goes to `.claude/workspace/research/YYYY-MM-DD-<slug>.md`. Phase 5 detects it as prior research.

## Phase 5: Design

Run `Skill("think", $ARGUMENTS)`. A machinery phase, so dispatch is required. Writing the SOW/Spec inline skips the critic-design attack. Generate SOW + Spec from the Phase 2 challenge output (verdict / decisions / trade-offs) and the Phase 4 research results as input. Output is `.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` + `spec.md`.

## Phase 6: Implementation

Run `Skill("code", $ARGUMENTS)`. A machinery phase, so dispatch is required. Implementing inline skips the RGRC cycle and the quality gates. `/code` auto-detects the SOW from the Phase 5 output.

## Phase 7: Quality

Get changed files with `git diff main...HEAD --name-only`. Both audit and polish are machinery phases and require dispatch. Convincing yourself you "reviewed it" inline skips the reviewer swarm and the external Codex. Phase 6 (`/code`) passes the mechanical baseline of lint / type / test / readability / coverage, so Phase 7 stacks two layers, internal audit and external polish. Audit runs a multi-dimensional review of security / resilience / causation / encapsulation under adversarial challenge with severity. Polish stacks external Codex (a non-Claude lens that counters Self-Enhancement bias) plus simplify / enhancer-code cleanup. Present any remaining issues to the user for a decision.

| Step | Action                                                                                                   | Exit condition                                                       |
| ---- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1    | Run `Workflow({name:"audit"})` against the diff (assigns severity, adversarial challenge)                | 0 critical/high → go to Step 3                                       |
| 2    | Fix each snapshot critical/high finding ID with `Skill("fix", "<ID>")`, then re-audit; this is one round | 0 critical/high or 3 rounds reached → go to Step 3                   |
| 3    | Run `Skill("polish")` against the uncommitted diff (external Codex + cleanup, fixes directly)            | Codex not installed → continue with cleanup only                     |
| 4    | Confirm tests pass                                                                                       | Test failure → fix (max 2). Still failing → present remaining issues |

If a polish fix breaks tests, polish stashes it internally. Surface any remaining issues before the Phase 8 commit.

## Phase 8: commit

After the quality layer and all tests pass, run `Skill("commit", ...)` to commit the changes in Conventional Commits format. A thin wrapper, so inline is fine. Planning artifacts and implementation land in one commit. If issues remain unresolved, present them to the user before committing.

## Phase 9: PR

Run `Skill("pr", $ARGUMENTS)` to create a PR from the committed changes. A thin wrapper, so inline is fine, but reproduce the body preview and the AskUserQuestion creation confirm even inline.

## Error handling

| Error                                    | Action                                      |
| ---------------------------------------- | ------------------------------------------- |
| `/challenge` returns NO-GO               | Present refuting evidence and stop          |
| `/checkout` finds branch exists          | Propose an alternate name or continue on it |
| `/research` or `/think` cancelled/failed | Save context and exit                       |
| `/code` failed                           | Present the error and ask the user          |
| Quality loop exhausted (3 rounds)        | Present remainder, user decides             |
| `/code` quality gate shows AC unmet      | Propose re-entry to Phase 6 or 7            |
| `/commit` failed                         | Present the error and ask the user          |
| `/pr` failed/cancelled                   | Present the error and ask the user          |

## Validation

The checks below apply when Phase 2's scope gate routed to the full chain. If build redirected to /code or /fix, follow that skill's completion criteria instead. End only when every check holds. Present the reason to the user for any check that cannot be met.

- [ ] PREFLIGHT passed
- [ ] challenge GO verdict
- [ ] Working branch created
- [ ] SOW + Spec generated
- [ ] All tests pass
- [ ] `/code` AC coverage
- [ ] Polish passed (Codex review + cleanup)
- [ ] Committed
- [ ] PR created
