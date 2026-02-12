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
| 6     | Quality        | /audit → /test → /polish                     | Issue triage             |
| 7     | Validation     | /validate → Summary                          | Completion               |

## Phase 1: Discovery

1. Quick context scan - check CLAUDE.md, package.json, Cargo.toml, etc. to match Context Patterns
2. If `$ARGUMENTS` empty → prompt with context-aware options (see Prompts reference)
3. Execute PRE_TASK_CHECK (follow rule: `rules/core/PRE_TASK_CHECK.md`)
4. Resolve any [→] or [?] via AskUserQuestion
5. Create todos via TaskCreate (Phase 2-4, 5, 6, 7)

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

## Phase 6: Quality Review

1. Execute /audit → /test → /polish
2. Present findings, ask for triage (see Prompts reference)
3. Address selected issues

## Phase 7: Validation

1. Execute /validate
2. Present summary

## Error Handling

| Condition                     | Action                                        |
| ----------------------------- | --------------------------------------------- |
| Team/teammate spawn fails     | Continue with remaining teammates or /code    |
| Teammate unresponsive/DM fail | shutdown_request, leader passes data directly |
| Implementer blocked/fails     | Leader takes over; if both fail → /code       |
| Integration tests fail        | Leader fixes cross-layer issues directly      |
| /code failure                 | Present error, ask for guidance               |
| /audit critical issues        | Block Phase 7 until resolved                  |
| User cancellation             | Save current phase + step to SOW metadata     |

## Prompts

[@../skills/orchestrating-feature/references/prompts.md]

## Resume

[@../skills/orchestrating-feature/references/resume.md]
