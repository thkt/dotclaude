---
name: swarm
description: Large-scale parallel implementation with multi-agent swarm. Architect + QA +
  Implementer(s) collaborate via peer DM. Use when user mentions 大規模実装,
  並列実装, swarm, チーム実装.
allowed-tools: Skill, Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*),
  Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run),
  Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git
  log:*), Bash(git diff:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task,
  TaskCreate, TaskList, TaskUpdate, TaskGet, SendMessage, TeamCreate,
  TeamDelete, AskUserQuestion
model: opus
argument-hint: "[implementation description]"
user-invocable: true
---

# /swarm - Large-Scale Parallel Implementation

Multi-agent swarm for large-scale implementation. Use /code for tasks under 5
files.

## When to Use

Use /swarm when ANY condition applies. Otherwise use /code.

| Condition             | /swarm |
| --------------------- | ------ |
| Files >= 5            | Yes    |
| Multi-domain          | Yes    |
| Design decisions many | Yes    |

## Leader Principle

Leader does NOT do substantive work:

- Does NOT read code for understanding
- Does NOT design contracts or architecture
- Does NOT debug or fix code
- Does NOT answer technical questions

Leader ONLY:

- Interfaces with user
- Executes QG commands mechanically
- Forwards results to agents
- Manages team lifecycle
- Tracks and reports progress (see Progress Tracking)

All substantive work happens through peer DM between Architect, QA, and
Implementer(s).

## Input

Implementation description: `$ARGUMENTS` (required, prompt if empty)

## SOW Context

See ../_lib/sow-resolution.md

## Team Architecture

| Agent          | subagent_type     | Responsibility                      | Bash | SendMessage | Model  |
| -------------- | ----------------- | ----------------------------------- | ---- | ----------- | ------ |
| Leader         | (self)            | User interface, QG, lifecycle       | Yes  | broadcast   | opus   |
| Architect      | architect-feature | Codebase analysis, contracts        | No   | peer DM     | opus   |
| QA             | team-qa       | Quality observations (non-blocking) | No   | peer DM     | sonnet |
| Implementer(s) | team-implementation  | RGRC implementation                 | Yes  | peer DM     | opus   |

### Model Constraint

Haiku is excluded from team agents — it cannot reliably follow multi-step
instructions or handle the shutdown protocol. The Model column in Team
Architecture defines each agent's model.

## Context Contracts

Peer DM transport with defined handoff structures: Spawn Context, Architect
Output, Implementer Started/Assignment/Completion.

→ Templates and response rules:
[references/contracts.md](references/contracts.md#context-contracts)

## Execution

| Phase | Action                         | Detail                                                     |
| ----- | ------------------------------ | ---------------------------------------------------------- |
| 0     | SOW Detection                  | [references/execution.md](references/execution.md#phase-0-sow-detection) |
| 1     | Team Setup + Architecture      | [references/execution.md](references/execution.md#phase-1-team-setup--architecture) |
| 1.5   | Decomposition Approval         | [references/execution.md](references/execution.md#phase-15-decomposition-approval) |
| 2     | Test Generation                | [references/execution.md](references/execution.md#phase-2-test-generation) |
| 3     | File Assignment                | [references/execution.md](references/execution.md#phase-3-file-assignment) |
| 4     | RGRC Implementation            | [references/execution.md](references/execution.md#phase-4-rgrc-implementation) |
| 5     | Integration + Quality Gates    | [references/execution.md](references/execution.md#phase-5-integration--quality-gates) |
| 6     | Summary                        | [references/execution.md](references/execution.md#phase-6-summary) |

Parallel spawn rule: Phase 4 must spawn all Implementers as concurrent Task
calls within a single response. One Task call per unit. Sequential spawning
defeats the swarm model and stretches wall time linearly.

## Error Handling

| Scenario                     | Action                                                         |
| ---------------------------- | -------------------------------------------------------------- |
| User cancels                 | `shutdown_request` to all agents, TeamDelete                   |
| Contract fundamentally wrong | Shutdown Implementers → Architect redesign                     |
| Implementer no started DM    | 120s timeout → shutdown → re-spawn (max 1 retry → user)        |
| Implementer death mid-work   | Leader checks worktree via git status → re-spawn (max 1 retry) |
| QG fails 3 times             | Escalate to user with details                                  |
| Agent Bash permission block  | Use `mode: "dontAsk"` for worktree-isolated Implementers       |
| test-gen timeout             | Leader generates tests directly                                |
| test-gen produces 0 tests    | Verify spec exists, ask user                                   |
| Shutdown unresponsive        | Retry with explicit tool params → move team dir to `~/.Trash/` |

## Progress Tracking

Leader reports progress table at key events (Phase 3 start, Implementer
started/completion, merge/QG results).

→ Display format and trigger events:
[references/contracts.md](references/contracts.md#progress-tracking)

## Abort / Rollback

→ Recovery procedures by phase:
[references/contracts.md](references/contracts.md#abort--rollback)
