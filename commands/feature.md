---
description: Comprehensive feature development with exploration, architecture, TDD, and quality gates. Use when user mentions 機能開発, 新機能, 機能追加, feature development.
allowed-tools: Skill, Read, Write, Glob, Grep, LS, Task, TaskCreate, TaskList, TaskUpdate, AskUserQuestion, TeamCreate, SendMessage
model: opus
argument-hint: "[feature description]"
---

# /feature - Feature Development Orchestrator

## Localization

Read `~/.claude/settings.json` `language` field. If set, translate user-facing text. Internal processing stays English.

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

1. Context scan -- CLAUDE.md, package.json, Cargo.toml, etc. to match Context Patterns
2. If `$ARGUMENTS` empty → prompt with context-aware options (see Prompts reference)
3. Execute PRE_TASK_CHECK (`rules/core/PRE_TASK_CHECK.md`)
4. Resolve any [→] or [?] via AskUserQuestion
5. Early exit: ≤ 2 target files in same subtree → suggest `/code` (skip Phases 2-7)
6. TaskCreate todos (Phases 2-4, 5, 6, 7)
7. Write `discovery` section to handoff.yaml

### Context Patterns

| Pattern            | Value              | Detection                                       | Options                                          |
| ------------------ | ------------------ | ----------------------------------------------- | ------------------------------------------------ |
| Claude Code config | claude-code-config | `~/.claude/` or `.claude/` with commands/hooks/ | Add command, Add skill, Add hook, Add agent      |
| React/Next.js      | react-nextjs       | package.json has `react`, `next`                | Add component, Add page, Add API route, Add hook |
| API server         | api-server         | Express, Fastify, Hono, or `src/routes/`        | Add endpoint, Add middleware, Add service        |
| CLI tool           | cli-tool           | bin in package.json or `src/cli/`               | Add command, Add option, Add subcommand          |
| Library            | library            | main/exports in package.json                    | Add function, Add class, Add type                |
| Fallback           | fallback           | No match                                        | New feature, Feature extension, Refactoring      |

## Phase 2-4: Team Exploration & Architecture

[@../skills/orchestrating-feature/references/exploration-team.md]

## Phase 5: Implementation

[@../skills/orchestrating-feature/references/implementation-team.md]

Write `implementation` section to handoff.yaml (files_changed, tests_added, mode).

## Phase 6: Quality Loop

[@../skills/orchestrating-feature/references/quality-loop.md]

Write `quality` section to handoff.yaml (iterations, auto_fixed, remaining, tests_passing).

## Phase 7: Validation

1. Read handoff.yaml for full feature context
2. Execute /validate
3. Present summary

## Error Handling

| Condition                     | Action                                     |
| ----------------------------- | ------------------------------------------ |
| Team/teammate spawn fails     | Continue with remaining teammates or /code |
| Teammate unresponsive/DM fail | shutdown_request, leader passes data       |
| Implementer blocked/fails     | Leader takes over; both fail → /code       |
| Integration tests fail        | Leader fixes cross-layer issues            |
| /code failure                 | Present error, ask for guidance            |
| Quality loop exhausted        | Present remaining before Phase 7           |
| User cancellation             | Save phase + step to SOW metadata          |
| All fallbacks exhausted       | Save progress to SOW, report terminal      |

## Prompts

[@../skills/orchestrating-feature/references/prompts.md]

## Resume

[@../skills/orchestrating-feature/references/resume.md]
