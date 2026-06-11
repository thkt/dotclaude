---
name: feature
description: Comprehensive feature development with exploration, architecture, TDD, and quality gates. Do NOT use for implementation without planning (use /code), bug fixes (use /fix), or planning only without implementation (use /think).
when_to_use: 機能開発, 新機能, 機能追加, feature development
allowed-tools: Skill Bash(npm run) Bash(npm run:*) Bash(npm test:*) Bash(yarn run) Bash(yarn run:*) Bash(pnpm run) Bash(pnpm run:*) Bash(bun run) Bash(bun run:*) Bash(make:*) Bash(git diff:*) Bash(git status:*) Bash(git log:*) Bash(git show:*) Bash(git ls-files:*) Bash(git worktree *) Bash(git merge *) Bash(git branch *) Bash(date:*) Bash(mkdir:*) Bash(agent-browser:*) Edit MultiEdit Write Read LS Task TaskCreate TaskList TaskUpdate AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
effort: xhigh
argument-hint: "[feature description]"
---

# /feature - Feature Development Orchestrator

Chain /think → /code → /audit for end-to-end feature development.

## Plugin Dependencies

| Plugin        | Required for | Install                           |
| ------------- | ------------ | --------------------------------- |
| agent-browser | Phase 5 only | `claude plugin add agent-browser` |

Phase 5 is skipped gracefully if agent-browser is not installed.

## Input

- Feature description: `$ARGUMENTS` (optional)
- If empty → prompt via AskUserQuestion (context-aware options)

### Context-Aware Options

Detect project type → present relevant options.

| Pattern            | Detection                                                   | Options                                   |
| ------------------ | ----------------------------------------------------------- | ----------------------------------------- |
| Claude Code config | ${CLAUDE_SKILL_DIR}/../../ or `.claude/` with skills/hooks/ | Add skill, Add hook, Add agent            |
| React/Next.js      | package.json has `react`, `next`                            | Add component, Add page, Add API route    |
| API server         | Express, Fastify, Hono, or `src/routes/`                    | Add endpoint, Add middleware, Add service |
| CLI tool           | bin in package.json or `src/cli/`                           | Add command, Add option, Add subcommand   |
| Library            | main/exports in package.json                                | Add function, Add class, Add type         |
| Fallback           | No match                                                    | New feature, Extension, Refactoring       |

## SOW Context

See ${CLAUDE_SKILL_DIR}/../\_lib/sow-resolution.md

## Execution

| Phase | Name                | Action                        | User Checkpoint                 |
| ----- | ------------------- | ----------------------------- | ------------------------------- |
| 1     | Discovery           | Context scan → PREFLIGHT      | Resolve unknowns and inferences |
| 2     | Design              | Skill: /think                 | Design approval                 |
| 3     | Implementation      | Skill: /code                  | -                               |
| 4     | Quality Loop        | /audit → /fix loop (max 3)    | Remaining issues only           |
| 5     | Visual Verification | Browser check (UI tasks only) | Visual approval                 |
| 6     | Summary             | AC coverage + scope report    | Completion                      |

### Phase 1: Discovery

1. Context scan: CLAUDE.md, package.json, Cargo.toml, etc.
2. If `$ARGUMENTS` empty → AskUserQuestion with context-aware options
3. Execute PREFLIGHT
4. Resolve any inferences or unknowns
5. Early exit: ≤ 2 target files → suggest `/code` (skip Phases 2-6)
6. TaskCreate for tracking (Phases 2-6)

### Phase 2: Design

Execute `Skill("think", $ARGUMENTS)`.

Output: `.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` + `spec.md`

### Phase 3: Implementation

Execute `Skill("code", $ARGUMENTS)`.

/code auto-discovers SOW from Phase 2 output.

### Phase 4: Quality Loop

#### Loop

| Step | Action                                 | Exit                       |
| ---- | -------------------------------------- | -------------------------- |
| 1    | Skill: /audit (changed files from git) | 0 critical/high → Finalize |
| 2    | Skill: /fix for each critical/high     | → Step 3                   |
| 3    | Increment iteration (max 3) → Step 1   | Max reached → Finalize     |

Changed files: `git diff main...HEAD --name-only`.

#### Finalize

| Step | Action                             | Exit                                           |
| ---- | ---------------------------------- | ---------------------------------------------- |
| 1    | Skill: /polish → verify tests pass | Tests fail → fix (max 2). Still failing → next |
| 2    | Present remaining issues (if any)  | User decides                                   |

### Phase 5: Visual Verification

#### Skip Conditions (evaluate in order, skip on first fail)

| #   | Check                               | How                                            | On fail       |
| --- | ----------------------------------- | ---------------------------------------------- | ------------- |
| 1   | UI files in changed files           | Match `.tsx`, `.jsx`, `.css`, `.scss`, `.html` | skip (silent) |
| 2   | agent-browser installed             | `which agent-browser`                          | skip (silent) |
| 3   | Dev server detected in package.json | Match `dev`, `start:dev`, `start` scripts      | skip (silent) |

#### Dev Server Detection

Detected from `package.json` scripts.

| Priority | Script name pattern      | Default URL           |
| -------- | ------------------------ | --------------------- |
| 1        | dev, start:dev           | http://localhost:5173 |
| 2        | start                    | http://localhost:3000 |
| 3        | storybook, storybook:dev | http://localhost:6006 |

Extract port from script value if specified (`--port`, `-p`, `PORT=`).

#### Workflow

1. Detect dev server script and URL
2. AskUserQuestion: "Dev server running at {url}? (Y to proceed / N to skip / custom URL)"
3. `agent-browser --headed open {url}` → navigate to page matching SOW scope (infer route from changed file paths or AC descriptions)
4. `agent-browser screenshot` → capture current state
5. Check AC items containing visual keywords (display, layout, UI, style, render, visible, responsive)
6. Present screenshot + findings to user
7. AskUserQuestion: "Visual check OK?" (Approve / Request fix / Skip)
8. If "Request fix" → return to Phase 4 Loop Step 2
9. `agent-browser close`

### Phase 6: Summary

Present summary. AC coverage is already verified by /code Quality Gates.

- Feature scope (files changed, tests added)
- Quality iterations and remaining issues
- AC coverage from /code

## Resume

Detect resume point from existing artifacts.

| Artifact                                    | Resume  |
| ------------------------------------------- | ------- |
| No SOW                                      | Phase 1 |
| SOW `draft`                                 | Phase 2 |
| SOW `in-progress` + no implementation       | Phase 3 |
| Implementation done + quality not completed | Phase 4 |
| Quality passed + UI files changed           | Phase 5 |
| Quality passed + no UI files                | Phase 6 |

Implementation evidence: `git diff main...HEAD --name-only` shows files matching SOW scope.

## Error Handling

| Error                               | Action                            |
| ----------------------------------- | --------------------------------- |
| /think cancelled or fails           | Save context, exit                |
| /code fails                         | Present error, ask user           |
| Quality loop exhausted (3 rounds)   | Present remaining, user decides   |
| agent-browser not installed         | Skip Phase 5, continue to Phase 6 |
| Dev server not running              | Skip Phase 5, continue to Phase 6 |
| /code Quality Gates shows unmet ACs | Offer to re-enter Phase 3 or 4    |

## Verification

| Check                 | Required |
| --------------------- | -------- |
| PREFLIGHT passed?     | Yes      |
| SOW + Spec generated? | Yes      |
| All tests pass?       | Yes      |
| /code AC coverage?    | Yes      |
