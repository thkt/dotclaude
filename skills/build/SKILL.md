---
name: build
description: Comprehensive implementation orchestrator chaining challenge / checkout / research / think / code / quality / commit. Runs end-to-end from GO/NO-GO premise verification through branch creation, design, TDD implementation, a code-review + audit quality layer, and commit. Use for any work spanning planning to implementation: new features, refactoring, migrations. Do NOT use for a single planned implementation (use /code). Do NOT use for bug fixes (use /fix). Do NOT use for planning only without implementation (use /think).
when_to_use: 一気通貫で実装, 新機能, 計画を要するリファクタリング, 大規模マイグレーション, build, end-to-end implementation
allowed-tools: Skill Bash(npm run) Bash(npm run:*) Bash(npm test:*) Bash(yarn run) Bash(yarn run:*) Bash(pnpm run) Bash(pnpm run:*) Bash(bun run) Bash(bun run:*) Bash(make:*) Bash(git diff:*) Bash(git status:*) Bash(git log:*) Bash(git show:*) Bash(git ls-files:*) Bash(git worktree *) Bash(git merge *) Bash(git branch *) Bash(date:*) Bash(mkdir:*) Edit MultiEdit Write Read LS Task TaskCreate TaskList TaskUpdate AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[implementation task]"
---

# /build - Implementation Orchestrator

Chains `/challenge` → `/checkout` → `/research` → `/think` → `/code` → quality → `/commit`, running end-to-end from premise GO verification through to committing test-verified implementation. Covers not just new features but refactoring and migrations. Every phase is mandatory (no early exit).

## Input

Take the implementation task from `$ARGUMENTS` (optional). If empty, ask the user what to implement via AskUserQuestion.

## Phase 1: PREFLIGHT

1. Context-scan CLAUDE.md, package.json, Cargo.toml, etc.
2. Run PREFLIGHT
3. Resolve inferences and unknowns
4. Track with TaskCreate (Phase 2-8)

## Phase 2: challenge

Run `Skill("challenge", $ARGUMENTS)` to verify the implementation premise as GO / NO-GO.

- NO-GO → present the refuting evidence and stop. Designing or implementing on a dead premise is wasted effort
- GO → pass Verdict / decisions / trade-offs / Actionable items into Phase 5 (think). Feeding the premise that challenge settled into think's design as a starting point turns the double critic-design attack (challenge and think) into a relationship where the premise GO/NO-GO feeds the design approach

## Phase 3: Branch

Run `Skill("checkout", $ARGUMENTS)` to create the working branch. Creating it after challenge GO avoids branching for a NO-GO proposal. The subsequent research / think / code artifacts and the final commit all land on this branch, keeping main clean. At the start the diff is empty, so naming leans mainly on `$ARGUMENTS`. Skip if already off the default branch.

## Phase 4: research

Run `Skill("research", $ARGUMENTS)`.

Output goes to `.claude/workspace/research/YYYY-MM-DD-<slug>.md`. Phase 5 detects it as prior research.

## Phase 5: Design

Run `Skill("think", $ARGUMENTS)`. Generate SOW + Spec from the Phase 2 challenge output (verdict / decisions / trade-offs) and the Phase 4 research results as input.

Output is `.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` + `spec.md`.

## Phase 6: Implementation

Run `Skill("code", $ARGUMENTS)`. `/code` auto-detects the SOW from the Phase 5 output.

## Phase 7: Quality

Get changed files with `git diff main...HEAD --name-only`. Present any remaining issues to the user for a decision.

| Step | Action                                                                                 | Exit condition                                                       |
| ---- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1    | Screen with `Skill("code-review", "medium")`                                           | No high/critical → go to Step 4                                      |
| 2    | If high/critical remain, deep-verify with `Skill("audit")`                             | 0 critical/high → go to Step 4                                       |
| 3    | `Skill("fix", "<ID>")` for each Step 2 snapshot critical/high finding ID → iteration++ | max 3 reached or resolved → go to Step 4                             |
| 4    | Confirm tests pass                                                                     | Test failure → fix (max 2). Still failing → present remaining issues |

## Phase 8: commit

After quality + tests pass, run `Skill("commit", ...)` to commit the changes in Conventional Commits format. Planning artifacts and implementation land in one commit. If issues remain unresolved, present them to the user before committing.

## Resume

Detect the resume point from existing artifacts. Since challenge leaves no persistent artifact, use the presence of research artifacts as the first detection key. If still on the default branch, run Phase 3 (checkout) before the matched phase. On re-entry, TaskCreate the remaining phases before continuing (Phase 1 is skipped, so no list gets created).

| Artifact                          | Resume              |
| --------------------------------- | ------------------- |
| No research & no SOW              | Phase 2 (challenge) |
| Research present & no SOW         | Phase 5 (think)     |
| SOW `draft`                       | Phase 5 (think)     |
| SOW `in-progress` with no impl    | Phase 6 (code)      |
| Implemented but quality unchecked | Phase 7 (quality)   |
| Quality passed but uncommitted    | Phase 8 (commit)    |

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

## Validation

End only when every check holds. Present the reason to the user for any check that cannot be met.

- challenge GO verdict
- Working branch created
- PREFLIGHT passed
- SOW + Spec generated
- All tests pass
- `/code` AC coverage
- Committed
