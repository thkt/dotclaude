---
name: swarm
description: Large-scale parallel implementation with multi-agent swarm. Architect + QA + Implementer(s) collaborate via peer DM.
when_to_use: 大規模実装, 並列実装, swarm, チーム実装
allowed-tools: Skill Bash(npm run) Bash(npm run:*) Bash(yarn run) Bash(yarn run:*) Bash(yarn:*) Bash(pnpm run) Bash(pnpm run:*) Bash(pnpm:*) Bash(bun run) Bash(bun run:*) Bash(bun:*) Bash(make:*) Bash(git status:*) Bash(git log:*) Bash(git diff:*) Edit MultiEdit Write Read LS Task TaskCreate TaskList TaskUpdate TaskGet SendMessage TeamCreate TeamDelete AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[implementation description]"
---

# /swarm - Large-Scale Parallel Implementation

Multi-agent swarm for large-scale implementation. Use /code for tasks under 5 files.

## When to Use

Use /swarm when any of these conditions apply. Otherwise use /code.

| Condition             | /swarm |
| --------------------- | ------ |
| Files >= 5            | Yes    |
| Multi-domain          | Yes    |
| Design decisions many | Yes    |

## Leader Principle

Leader is the orchestrator, not a worker. Substantive work happens through peer DM between Architect, QA, and Implementer(s).

### Restrictions

- Does not read code for understanding
- Does not design contracts or architecture
- Does not debug or fix code
- Does not answer technical questions

### Responsibilities

- Interfaces with user
- Executes QG commands mechanically
- Forwards results to agents
- Manages team lifecycle
- Tracks and reports progress, see Progress Tracking section below

## Input

Implementation description: `$ARGUMENTS` (required, prompt if empty)

## SOW Context

See ${CLAUDE_SKILL_DIR}/../_lib/sow-resolution.md

## Team Architecture

| Agent          | subagent_type       | Responsibility                      | Bash | SendMessage | Model  |
| -------------- | ------------------- | ----------------------------------- | ---- | ----------- | ------ |
| Leader         | (self)              | User interface, QG, lifecycle       | Yes  | broadcast   | opus   |
| Architect      | architect-feature   | Codebase analysis, contracts        | No   | peer DM     | opus   |
| QA             | team-qa             | Quality observations (non-blocking) | No   | peer DM     | sonnet |
| Implementer(s) | team-implementation | RGRC implementation                 | Yes  | peer DM     | opus   |

### Model Constraint

Haiku is excluded from team agents. It cannot reliably follow multi-step instructions or handle the shutdown protocol. The Model column in Team Architecture defines each agent's model.

## Context Contracts

Peer DM transport with handoff structures (Spawn Context, Architect Output, Implementer Started/Assignment/Completion).

See: ${CLAUDE_SKILL_DIR}/references/contracts.md#context-contracts

## Execution

| Phase | Action                      | Detail                                                                         |
| ----- | --------------------------- | ------------------------------------------------------------------------------ |
| 0     | SOW Detection               | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-0-sow-detection              |
| 1     | Team Setup + Architecture   | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-1-team-setup--architecture   |
| 2     | Decomposition Approval      | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-2-decomposition-approval     |
| 3     | Test Generation             | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-3-test-generation            |
| 4     | File Assignment             | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-4-file-assignment            |
| 5     | RGRC Implementation         | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-5-rgrc-implementation        |
| 6     | Integration + Quality Gates | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-6-integration--quality-gates |
| 7     | Summary                     | ${CLAUDE_SKILL_DIR}/references/execution.md#phase-7-summary                    |

### Parallel Spawn Rule

Phase 5 must spawn all Implementers as concurrent Task calls within a single response. One Task call per unit. Sequential spawning defeats the swarm model and stretches wall time linearly.

## Error Handling

| Scenario                     | Action                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| User cancels                 | `shutdown_request` to all agents, TeamDelete                  |
| Contract fundamentally wrong | Shutdown Implementers, Architect redesign                     |
| Implementer no started DM    | 120s timeout, shutdown, re-spawn (max 1 retry, escalate)      |
| Implementer death mid-work   | Leader checks worktree via git status, re-spawn (max 1 retry) |
| QG fails 3 times             | Escalate to user with details                                 |
| Agent Bash permission block  | Use `mode: "dontAsk"` for worktree-isolated Implementers      |
| test-gen timeout             | Leader generates tests directly                               |
| test-gen produces 0 tests    | Verify spec exists, ask user                                  |
| Shutdown unresponsive        | Retry with explicit tool params, move team dir to `~/.Trash/` |

## Progress Tracking

Leader reports progress table at key events (Phase 4 start, Implementer started/completion, merge/QG results).

See: ${CLAUDE_SKILL_DIR}/references/contracts.md#progress-tracking

## Abort / Rollback

Recovery procedures by phase.

See: ${CLAUDE_SKILL_DIR}/references/contracts.md#abort--rollback
