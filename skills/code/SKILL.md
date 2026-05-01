---
name: code
description: Implement code following TDD/RGRC cycle with real-time test feedback. Do NOT use for small bug fixes or error resolution (use /fix instead).
when_to_use: 実装して, コード書いて, implement, coding
allowed-tools: Bash(npm run) Bash(npm run:*) Bash(yarn run) Bash(yarn run:*) Bash(yarn:*) Bash(pnpm run) Bash(pnpm run:*) Bash(pnpm:*) Bash(bun run) Bash(bun run:*) Bash(bun:*) Bash(cargo:*) Bash(make:*) Bash(git status:*) Bash(git log:*) Bash(which:*) Edit MultiEdit Write Read Glob Grep LS Task AskUserQuestion
model: opus
argument-hint: "[implementation description] [--no-storybook]"
---

# /code - TDD Implementation

NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

Violation → delete the code, write the test, then rewrite.

## Announce at Start

Before writing any code, output the declaration below verbatim.

> Starting TDD RGRC cycle. Every code change begins with a failing test.

## Rationalization Counters

| Excuse                               | Counter                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------ |
| "This is too simple for TDD"         | Simple changes hide regressions. One test line prevents hours of debug   |
| "I'll add tests later"               | "Later" never comes. Test debt compounds with interest                   |
| "This is just a refactor"            | Refactors without tests are the #1 cause of silent regressions           |
| "Existing tests already cover"       | If they do, Red phase will confirm it. Run it                            |
| "Testing this would be too slow"     | A slow test is faster than a production bug                              |
| "Red test doesn't need verification" | Untested Red = writing blind. Run it; confirm failure matches the intent |

## Input

- `$ARGUMENTS` holds the implementation description (required, prompt if empty)

### Flags

| Flag             | Effect                                                  |
| ---------------- | ------------------------------------------------------- |
| `--no-storybook` | Disable Storybook auto-detection (default: auto-detect) |

Auto-detects when project has Storybook + component file. See Storybook Phase.

## SOW Context

See ${CLAUDE_SKILL_DIR}/../_lib/sow-resolution.md

## Scope Guard

After reading SOW, check Phase file counts. If any Phase has Files ≥ 5, stop and ask user to split via `/think` before proceeding. If no SOW exists and `$ARGUMENTS` implies ≥ 5 files, suggest running `/think` first.

## Target Languages

JS/TS is first-class. Rust / Go / Python work via `generator-test` framework detection. When detection fails, specify the test runner explicitly in the task prompt. Storybook/E2E phases auto-skip for non-JS/TS via their existing conditions. Quality Gates are language-agnostic (T-NNN coverage, gates hook per language pre/post-edit).

## External References

| Reference                                       | When read                           | If not found / unclear                          |
| ----------------------------------------------- | ----------------------------------- | ----------------------------------------------- |
| ${CLAUDE_SKILL_DIR}/../_lib/sow-resolution.md   | Step 1 SOW detect                   | No SOW state, apply Scope Guard inline only     |
| ${CLAUDE_SKILL_DIR}/references/csf3-patterns.md | Storybook Phase all conditions pass | Use minimal CSF3 stories format                 |
| `ralph-loop` plugin                             | Step 4 RGRC iteration               | Manual Red → Green → Refactor loop              |
| `generator-test` agent                          | Step 2 spawn                        | Error Handling: Leader generates tests directly |
| `evaluator-test` agent                          | Step 8 Quality Gates, Spec exists   | Skip Test Quality gate                          |
| `reviewer-readability` agent                    | Step 5 Review Gate                  | Skip for /fix; continue with manual review      |

## Notation

| Symbol       | Meaning                                                           | Usage                                                              |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `T-NNN`      | `T-\d{3}` three-digit zero-padded spec scenario ID (e.g. `T-001`) | Embed in test function name, describe/it string, or inline comment |
| `TaskOutput` | Synchronous receive from `run_in_background: true` spawn          | Wait for completion before proceeding                              |

## Execution

1. SOW Context: detect and read SOW/spec → Scope Guard
2. Spawn `generator-test` as background agent (`subagent_type: generator-test`, `run_in_background: true`)
3. Receive test results via `TaskOutput` (wait for completion before implementation)
4. RGRC cycle with `ralph-loop --max-iterations 10` auto-iteration
5. Review Gate: spawn `reviewer-readability` (skip for /fix)
6. Storybook Phase (conditional)
7. E2E Phase (conditional)
8. Quality Gates

## Spec Evolution

During implementation, new requirements may be discovered (edge cases, error handling, integration concerns).

1. Update Spec first: Add T-NNN to the Test Scenarios table in spec.md
2. Then write the test: Reference the new T-NNN in the test name/comment
3. Never add tests without a Spec trace: Every test must map to a T-NNN

`evaluator-test` uses T-NNN mappings to compute coverage and other quality metrics.

## Storybook Phase (Conditional)

### Conditions

All must pass, evaluated in order, skip on first fail.

| #   | Check                                     | How                                                         | On fail       |
| --- | ----------------------------------------- | ----------------------------------------------------------- | ------------- |
| 1   | `--no-storybook` flag not set             | Parse `$ARGUMENTS`                                          | skip (silent) |
| 2   | Project has Storybook                     | `.storybook/` exists OR `@storybook/*` in package.json deps | skip (silent) |
| 3   | Implementation includes component file(s) | `.tsx`/`.jsx` with PascalCase export in changed files       | skip (silent) |

### Declare

When conditions match, announce before generating.

```
[auto-detect] Storybook detected + {File}.tsx appears to be a component.
Will generate {File}.stories.tsx. Opt out with --no-storybook.
```

### Execution

For each detected component, generate `{Component}.stories.tsx` per ${CLAUDE_SKILL_DIR}/references/csf3-patterns.md. Source props from Spec's Component API section when present, otherwise infer from the component.

### Existing Stories Handling

| Option | Action                    |
| ------ | ------------------------- |
| [O]    | Overwrite existing file   |
| [S]    | Skip - keep existing      |
| [M]    | Merge - show diff, manual |
| [D]    | Diff only - append new    |

## E2E Phase (Conditional)

### Conditions

All must pass, evaluated in order, skip on first fail.

| #   | Check                               | How                                       | On fail         |
| --- | ----------------------------------- | ----------------------------------------- | --------------- |
| 1   | Spec has `Type: e2e` scenarios      | Grep Spec Test Scenarios table            | skip (silent)   |
| 2   | agent-browser installed             | `which agent-browser`                     | skip + advisory |
| 3   | Dev server detected in package.json | Match `dev`, `start:dev`, `start` scripts | skip + advisory |
| 4   | Dev server running (user confirms)  | AskUserQuestion: "Dev server at {url}?"   | skip + advisory |

### Dev Server Detection

Detected from `package.json` scripts.

| Priority | Script name pattern      | Default URL           |
| -------- | ------------------------ | --------------------- |
| 1        | dev, start:dev           | http://localhost:5173 |
| 2        | start                    | http://localhost:3000 |
| 3        | storybook, storybook:dev | http://localhost:6006 |

Extract port from script value if specified (`--port`, `-p`, `PORT=`).

### Execution

```
Agent(subagent_type: "generator-e2e",
      prompt: "spec_path: <path>\ndev_server_url: <url>",
      run_in_background: true)
```

## Quality Gates

| Check                     | Condition                  | How                        |
| ------------------------- | -------------------------- | -------------------------- |
| AC met                    | After RGRC                 | Manual (skip if no SOW)    |
| Test Quality (per-metric) | Spec exists                | `evaluator-test` agent     |
| Iteration enforcement     | Every Write/Edit/MultiEdit | `gates` hook (PostToolUse) |

See use-workflow-code for invocation details.

## Error Handling

| Error                            | Action                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------- |
| generator-test timeout           | Leader generates tests directly                                                  |
| generator-test produces 0 tests  | Verify spec exists, ask user                                                     |
| ralph-loop stalls                | Stop loop, fix manually                                                          |
| Quality gates fail               | Fix issues before commit                                                         |
| Evaluator metric below threshold | Fix uncovered/excess/duplicate/granularity/intent issues                         |
| Evaluator timeout                | Skip gate, log warning                                                           |
| Spec not found                   | Proceed without T-NNN trace, skip Test Quality gate (or ask user to create spec) |
| agent-browser crash              | Skip E2E, advisory, continue                                                     |
| Dev server unreachable           | Skip E2E, advisory, continue                                                     |
| E2E tests fail                   | Advisory (do not block)                                                          |
| Storybook phase error            | Skip phase, advisory, continue                                                   |
