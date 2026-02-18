---
description: Comprehensive feature development with exploration, architecture, TDD, and quality gates. Use when user mentions 機能開発, 新機能, 機能追加, feature development.
allowed-tools: Skill, Read, Write, Glob, Grep, LS, Task, TaskCreate, TaskList, TaskUpdate, AskUserQuestion, TeamCreate, SendMessage
model: opus
argument-hint: "[feature description]"
---

# /feature - Feature Development Orchestrator

## Localization

Read `~/.claude/settings.json` and check the `language` field. If set, translate user-facing text to that language. Keep internal processing in English.

## Input

- Feature description: `$1` (optional)
- If empty → prompt via AskUserQuestion (see Prompts reference)

## Execution Flow

| Phase | Name           | Action                                       | User Checkpoint          |
| ----- | -------------- | -------------------------------------------- | ------------------------ |
| 1     | Discovery      | Context scan → PRE_TASK_CHECK                | [?] or [→] resolution    |
| 2-4   | Team Explore   | Explorer team + Architect → Clarify → /think | Clarification + Approach |
| 5     | Implementation | Parallel or Sequential TDD/RGRC              | Approval + mode select   |
| 6     | Quality Loop   | audit→fix→re-audit (max 3) → /polish         | Remaining issues only    |
| 7     | Validation     | /validate → Summary                          | Completion               |

## Phase Handoff

[@../skills/orchestrating-feature/references/phase-handoff.md]

## Phase 1: Discovery

1. Quick context scan - check CLAUDE.md, package.json, Cargo.toml, etc. to match Context Patterns
2. If `$ARGUMENTS` empty → prompt with context-aware options (see Prompts reference)
3. Execute PRE_TASK_CHECK (follow rule: `rules/core/PRE_TASK_CHECK.md`)
4. Resolve any [→] or [?] via AskUserQuestion
5. Create todos via TaskCreate (Phase 2-4, 5, 6, 7)
6. Write `discovery` section to handoff.yaml

### Context Patterns

| Pattern            | Detection                                       | Options                                          |
| ------------------ | ----------------------------------------------- | ------------------------------------------------ |
| Claude Code config | `~/.claude/` or `.claude/` with commands/hooks/ | Add command, Add skill, Add hook, Add agent      |
| React/Next.js      | package.json has `react`, `next`                | Add component, Add page, Add API route, Add hook |
| API server         | Express, Fastify, Hono, or `src/routes/`        | Add endpoint, Add middleware, Add service        |
| CLI tool           | bin in package.json or `src/cli/`               | Add command, Add option, Add subcommand          |
| Library            | main/exports in package.json                    | Add function, Add class, Add type                |
| Fallback           | No match                                        | New feature, Feature extension, Refactoring      |

## Phase 2-4: Team Exploration & Architecture

[@../skills/orchestrating-feature/references/exploration-team.md]

## Phase 5: Implementation

[@../skills/orchestrating-feature/references/implementation-team.md]

Write `implementation` section to handoff.yaml (files_changed, tests_added, mode).

## Phase 6: Quality Loop

Read `implementation` from handoff.yaml. Automatic review→fix→re-review cycle.

| Step | Action                                              | Exit Condition              |
| ---- | --------------------------------------------------- | --------------------------- |
| 1    | /audit (capture critical + high findings)           | 0 critical/high → Step 1b  |
| 1b   | AC check (see below)                                | All ACs met → Step 1c     |
| 1c   | /test (verify implementation passes)                | Tests fail → Step 2       |
| 2    | Auto-fix audit findings + unmet ACs                 | —                           |
| 3    | /test (verify no regression)                        | Tests fail → revert, Step 4 |
| 4    | Increment iteration (max 3) → Go to Step 1         | Max reached → Step 4b      |
| 4b   | Present remaining issues to user (Prompt: Triage)   | User decides                |
| 5    | /polish → /test (final)                             | Tests fail → fix, re-test  |

### AC Check (Step 1b)

Read SOW acceptance criteria (path from `architecture.sow_path` in handoff.yaml). For each AC:

| Check        | Method                                              |
| ------------ | --------------------------------------------------- |
| Implemented? | Grep target files for AC-related logic              |
| Tested?      | Grep test files for AC-related assertions           |

Unmet ACs are treated as findings and included in Step 2 auto-fix.

### Auto-fix Rules

| Severity | Action                                    |
| -------- | ----------------------------------------- |
| Critical | Always fix                                |
| High     | Fix if confidence ≥80%                    |
| Medium   | Skip                                      |
| Low      | Skip                                      |

### Regression Guard

If /test fails after auto-fix: revert last fix batch, mark those findings as "auto-fix failed", present to user.

Write `quality` section to handoff.yaml (iterations, auto_fixed, remaining, tests_passing).

## Phase 7: Validation

1. Read handoff.yaml for full feature context
2. Execute /validate
3. Present summary

## Error Handling

| Condition                     | Action                                        |
| ----------------------------- | --------------------------------------------- |
| Team/teammate spawn fails     | Continue with remaining teammates or /code    |
| Teammate unresponsive/DM fail | shutdown_request, leader passes data directly |
| Implementer blocked/fails     | Leader takes over; if both fail → /code       |
| Integration tests fail        | Leader fixes cross-layer issues directly      |
| /code failure                 | Present error, ask for guidance               |
| Quality loop exhausted        | Present remaining to user before Phase 7      |
| User cancellation             | Save current phase + step to SOW metadata     |
| All fallbacks exhausted       | Save progress to SOW, report terminal state   |

## Prompts

[@../skills/orchestrating-feature/references/prompts.md]

## Resume

[@../skills/orchestrating-feature/references/resume.md]
