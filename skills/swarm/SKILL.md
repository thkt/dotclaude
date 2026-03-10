---
name: swarm
description:
  Large-scale parallel implementation with multi-agent swarm. Architect + QA +
  Implementer(s) collaborate via peer DM. Use when user mentions 大規模実装,
  並列実装, swarm, チーム実装.
allowed-tools:
  Skill, Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*),
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

Implementation description: `$1` (required, prompt if empty)

## SOW Context

[@../skills/lib/sow-resolution.md]

## Team Architecture

| Agent          | subagent_type     | Responsibility                      | Bash | SendMessage | Model  |
| -------------- | ----------------- | ----------------------------------- | ---- | ----------- | ------ |
| Leader         | (self)            | User interface, QG, lifecycle       | Yes  | broadcast   | opus   |
| Architect      | feature-architect | Codebase analysis, contracts        | No   | peer DM     | opus   |
| QA             | qa-reviewer       | Quality observations (non-blocking) | No   | peer DM     | sonnet |
| Implementer(s) | unit-implementer  | RGRC implementation                 | Yes  | peer DM     | opus   |

### Model Constraint

Haiku is excluded from team agents — it cannot reliably follow multi-step
instructions or handle the shutdown protocol. The Model column in Team
Architecture defines each agent's model.

## Context Contracts

Each handoff has a defined structure. Peer DM is the transport; these contracts
define what to send.

### Spawn Context (Leader → all agents)

Every spawn prompt includes:

- CLAUDE.md rules (or summary of key constraints)
- Project conventions (tech stack, naming, patterns)
- SOW/spec content (if available)

### Architect Output (Architect → Leader)

```yaml
contracts:
  - name: "<interface/type name>"
    definition: "<TypeScript interface or type>"
    used_by: ["<file paths>"]
shared_changes: # files modified by multiple units (types, config, etc.)
  - file: "<file path>"
    change: "<description of change>"
    apply_before: parallel # merge to main before parallel execution
parallel_units:
  - unit_id: 1
    files: ["<file paths>"]
    depends_on: [] # GOAL: keep empty (independence-first)
  - unit_id: 2
    files: ["<file paths>"]
    depends_on: [] # only populate when unavoidable, with rationale
build_sequence: ["unit_id order if dependencies exist"]
```

### Implementer Assignment (Leader → Implementer)

```yaml
unit_id: 1
contracts: ["<relevant contracts only>"]
files: ["<assigned file paths>"]
tests: ["<assigned test file paths>"]
constraints: ["<project-specific rules from CLAUDE.md>"]
```

### Implementer Completion (Implementer → Leader)

```yaml
unit_id: 1
status: complete | blocked
files_modified: ["<paths>"]
tests: { total: N, passed: N, failed: N }
issues: [{ description: "<issue>", severity: blocker | warning }]
```

## Execution

### Phase 0: SOW Detection

1. SOW/spec auto-detection
2. SOW なし → `$1` is sole instruction

### Phase 1: Team Setup + Architecture

1. `TeamCreate` with name `swarm-{timestamp}`
2. Spawn Architect (feature-architect) with prompt:
   - Spawn Context (see Context Contracts)
   - `$1` implementation description
   - Instruction: explore codebase (yomu preferred, grep/glob fallback) → design
     contracts → file groupings
   - Expected output: Architect Output contract (YAML via DM)
3. Spawn QA (qa-reviewer) with prompt:
   - Instruction: observe Architect's design, comment via peer DM
   - Read team config to discover teammates
4. Wait for Architect's contract DM

### Phase 1.5: Decomposition Approval

1. Present Architect's decomposition to user:
   - Parallel units with file assignments
   - Shared changes (applied before parallel execution)
   - Dependency graph (ideally all independent)
   - Estimated worker count
2. User may adjust:
   - Merge/split units
   - Reassign files between units
   - Override dependency decisions
3. Proceed to Phase 2 after approval

### Phase 2: Test Generation

1. After final Architect Output contract is confirmed (Phase 1 + QA review)
2. Spawn test-generator as standalone background agent
   (`subagent_type: test-generator`, `run_in_background: true`)
3. Include Architect's contract in test-gen prompt
4. Receive test results via `TaskOutput`

### Phase 3: File Assignment

1. Receive final Architect Output contract (confirmed after QA review rounds)
2. Receive test-gen results via `TaskOutput`
3. Spawn Implementer(s) per Architect's `parallel_units` (mechanical — no
   analysis):
   - One Implementer per parallel unit (worktree isolation)
   - Single unit → single Implementer
   - `mode: "dontAsk"` (worktree isolation provides safety for autonomous Bash)
   - Prompt: Implementer Assignment contract (see Context Contracts)
   - Instruction: RGRC cycle, DM Architect for questions
4. Forward file assignments to QA for observation

### Phase 4: RGRC Implementation

1. Implementer(s) work on assigned files
2. Peer DM flow:
   - Implementer ↔ Architect: contract questions, design clarification
   - QA → Implementer: edge case observations
   - QA → Architect: contract quality observations
   - QA → Leader: verification command requests
3. Leader handles QA verification requests mechanically:
   - Receive command request → execute → return result to QA
4. Wait for all Implementers to complete (DM with status)

### Phase 5: Integration + Quality Gates

#### 5a: Merge Strategy

1. Apply shared_changes first (from Architect Output):
   - Leader applies shared changes to main branch directly
   - If application fails → halt merge, escalate to user
   - Verify: run type-check/lint on main after applying
2. Merge remaining worktrees sequentially:
   - Merge independent units in completion order
   - For units with depends_on, merge in build_sequence order
   - Resolve conflicts via `git merge` or update branch
3. Final state: all changes on main branch

#### 5b: Quality Gates

1. Leader executes QG on main branch (tests, lint, types, coverage)
2. On failure:
   - Identify responsible agent from failing file
   - Forward failure details to that agent via DM
   - Agent fixes and reports back
3. Re-run QG after fix
4. Max 3 iterations → escalate to user

### Phase 6: Summary

1. Collect results from all agents
2. Generate summary report (files modified, tests, issues)
3. Shutdown all agents (`shutdown_request`)
4. `TeamDelete` for cleanup
5. Present summary to user

## Error Handling

| Scenario                     | Action                                                         |
| ---------------------------- | -------------------------------------------------------------- |
| User cancels                 | `shutdown_request` to all agents, TeamDelete                   |
| Contract fundamentally wrong | Shutdown Implementers → Architect redesign                     |
| Implementer timeout          | Shutdown timed-out Implementer, others continue                |
| QG fails 3 times             | Escalate to user with details                                  |
| Agent Bash permission block  | Use `mode: "dontAsk"` for worktree-isolated Implementers       |
| test-gen timeout             | Leader generates tests directly                                |
| test-gen produces 0 tests    | Verify spec exists, ask user                                   |
| Shutdown unresponsive        | Retry with explicit tool params → move team dir to `~/.Trash/` |

## Progress Tracking

Leader maintains a progress table and reports to user at key events:

### Display Format

```
## Swarm Progress

| Unit | Files | Implementer | Status      | Duration |
| ---- | ----- | ----------- | ----------- | -------- |
| 1    | 3     | impl-1      | complete    | 2m 30s   |
| 2    | 2     | impl-2      | in_progress | 1m 45s   |
| 3    | 4     | impl-3      | in_progress | 1m 45s   |

Shared changes: applied
Integration: pending (2/3 units complete)
```

### Trigger Events

| Event                   | Action                           |
| ----------------------- | -------------------------------- |
| Phase 3 start           | Show initial table (all pending) |
| Implementer completion  | Update row, show progress        |
| All Implementers done   | Show timeline summary            |
| Phase 5a merge progress | Show merge status per unit       |
| Phase 5b QG result      | Show pass/fail with details      |

## Abort / Rollback

| Scenario               | Recovery                                                            |
| ---------------------- | ------------------------------------------------------------------- |
| Mid-Phase 1 abort      | Shutdown Architect + QA, TeamDelete                                 |
| Mid-Phase 2/3 abort    | Shutdown test-gen + QA, TeamDelete                                  |
| Mid-Phase 4 abort      | Shutdown all Implementers + QA, TeamDelete                          |
| Mid-Phase 5 abort      | Tag main before merges; revert merged commits if needed, TeamDelete |
| Partial implementation | Implementer worktrees contain changes, user decides to keep/discard |
