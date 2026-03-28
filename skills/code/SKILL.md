---
name: code
description: Implement code following TDD/RGRC cycle with real-time test feedback. Use when
  user mentions 実装して, コード書いて, implement, coding. Do NOT use for small
  bug fixes or error resolution (use /fix instead).
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*),
  Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run),
  Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git
  log:*), Bash(which:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task,
  AskUserQuestion
model: opus
argument-hint: "[implementation description] [--frontend] [--principles] [--storybook]"
user-invocable: true
---

# /code - TDD Implementation

NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

Violation → delete the code, write the test, then rewrite.

## Announce at Start

Before writing any code, declare:

> Starting TDD RGRC cycle. Every code change begins with a failing test.

## Rationalization Counters

| Excuse                           | Counter                                                                |
| -------------------------------- | ---------------------------------------------------------------------- |
| "This is too simple for TDD"     | Simple changes hide regressions. One test line prevents hours of debug |
| "I'll add tests later"           | "Later" never comes. Test debt compounds with interest                 |
| "This is just a refactor"        | Refactors without tests are the #1 cause of silent regressions         |
| "Existing tests already cover"   | If they do, Red phase will confirm it. Run it                          |
| "Testing this would be too slow" | A slow test is faster than a production bug                            |

## Input

Implementation description: `$1` (required, prompt if empty) Flags:
`--frontend`, `--principles`, `--storybook`

| Flag           | Loads                      |
| -------------- | -------------------------- |
| `--frontend`   | applying-frontend-patterns |
| `--principles` | applying-code-principles   |
| `--storybook`  | integrating-storybook      |

## SOW Context

[@../skills/lib/sow-resolution.md]

## Skills & Agents

- Agent: test-generator (TDD test generation, standalone background)
- Agent: e2e-test-generator (E2E test generation, conditional background)
- Agent: code-quality-reviewer (review gate, post-RGRC)
- Skill: orchestrating-workflows (RGRC cycle)
- Hook: gates (completion gate + review enforcement, auto-iteration)

<!-- canonical: rules/core/PRE_TASK_CHECK.md (decomposition thresholds) -->

## Scope Guard

After reading SOW, check Phase file counts. If any Phase has Files ≥ 5, stop and
ask user to split via `/think` before proceeding. If no SOW exists and `$1`
implies ≥ 5 files, suggest running `/think` first.

## Execution

1. SOW Context: detect and read SOW/spec → Scope Guard
2. Spawn `test-gen` as standalone background agent
   (`subagent_type: test-generator`, `run_in_background: true`)
3. Receive test results via `TaskOutput`
4. RGRC cycle with `ralph-loop --max-iterations 10` auto-iteration
5. Review Gate: spawn `code-quality-reviewer` (skip for /fix)
6. E2E Phase (conditional)
7. Quality Gates

<!-- canonical: skills/orchestrating-workflows (full gate table) -->

## Spec Evolution

During implementation, new requirements may be discovered (edge cases, error
handling, integration concerns). When this happens:

1. Update Spec first: Add T-NNN to the Test Scenarios table in spec.md
2. Then write the test: Reference the new T-NNN in the test name/comment
3. Never add tests without a Spec trace: Every test must map to a T-NNN

This keeps the Spec as the single source of truth. The `test-quality-evaluator`
agent uses T-NNN mappings to compute coverage scores.

## E2E Phase (Conditional)

After Review Gate, before Quality Gates. Skip entirely if any condition fails.

### Conditions (all must pass, evaluate in order, skip on first fail)

| #   | Check                               | How                                       | On fail         |
| --- | ----------------------------------- | ----------------------------------------- | --------------- |
| 1   | Spec has `Type: e2e` scenarios      | Grep Spec Test Scenarios table            | skip (silent)   |
| 2   | agent-browser installed             | `which agent-browser`                     | skip + advisory |
| 3   | Dev server detected in package.json | Match `dev`, `start:dev`, `start` scripts | skip + advisory |
| 4   | Dev server running (user confirms)  | AskUserQuestion: "Dev server at {url}?"   | skip + advisory |

### Dev Server Detection

From `package.json` scripts (same pattern as /feature Phase 4.5):

| Priority | Script name pattern          | Default URL             |
| -------- | ---------------------------- | ----------------------- |
| 1        | `dev`, `start:dev`           | `http://localhost:5173` |
| 2        | `start`                      | `http://localhost:3000` |
| 3        | `storybook`, `storybook:dev` | `http://localhost:6006` |

Extract port from script value if specified (`--port`, `-p`, `PORT=`).

### Execution

```
Agent(subagent_type: "e2e-test-generator",
      prompt: "spec_path: <path>\ndev_server_url: <url>",
      run_in_background: true)
```

Results: generated tests run and pass → proceed. Failures → advisory (do not
block Quality Gates).

## Quality Gates

After RGRC cycle, verify each AC is met (implemented + tested). Skip if no SOW.

If Spec exists, run via `Agent(subagent_type: "test-quality-evaluator")` in
background. Score ≥70 required. See orchestrating-workflows for gate details.

## Error Handling

| Error                       | Action                             |
| --------------------------- | ---------------------------------- |
| test-gen background timeout | Leader generates tests directly    |
| test-gen produces 0 tests   | Verify spec exists, ask user       |
| Ralph-loop stalls           | Stop loop, fix manually            |
| Quality gates fail          | Fix issues before commit           |
| Evaluator score <70         | Fix uncovered/excess/intent issues |
| Evaluator timeout           | Skip gate, log warning             |
| Spec not found              | Create spec.md or ask user         |
| agent-browser crash         | Skip E2E, advisory, continue       |
| Dev server unreachable      | Skip E2E, advisory, continue       |
| E2E tests fail              | Advisory (do not block)            |
