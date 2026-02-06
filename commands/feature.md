---
description: Comprehensive feature development with exploration, architecture, TDD, and quality gates
allowed-tools: Skill, Read, Write, Glob, Grep, LS, Task, TaskCreate, TaskList, TaskUpdate, AskUserQuestion, TeamCreate, SendMessage
model: opus
argument-hint: "[feature description]"
---

# /feature - Feature Development Orchestrator

## Localization

Read `~/.claude/settings.json` and check the `language` field. If set, translate user-facing text to that language. Keep internal processing in English.

## Input

- Feature description: `$1` (optional)
- If empty → prompt via AskUserQuestion (see Prompt: Feature Type)

## Execution Flow

| Phase | Name           | Action                                       | User Checkpoint          |
| ----- | -------------- | -------------------------------------------- | ------------------------ |
| 1     | Discovery      | Context scan → PRE_TASK_CHECK                | [?] or [→] resolution    |
| 2-4   | Team Explore   | Explorer team + Architect → Clarify → /think | Clarification + Approach |
| 5     | Implementation | Parallel or Sequential TDD/RGRC              | Approval + mode select   |
| 6     | Quality        | /audit → /test → /polish                     | Issue triage             |
| 7     | Validation     | /validate → Summary                          | Completion               |

## Phase 1: Discovery

### Steps

1. Quick context scan (detect project type before prompting)
   - Check CLAUDE.md, package.json, Cargo.toml, pyproject.toml, etc.
   - Match against Context Patterns
2. If `$ARGUMENTS` empty → prompt with context-aware options
3. Execute Understanding Check (see below)
4. If any [→] or [?] → resolve via AskUserQuestion
5. Create todos via TaskCreate (Phase 2-4, 5, 6, 7)

### Understanding Check

| Marker | Meaning  | Action Required               |
| ------ | -------- | ----------------------------- |
| [✓]    | Verified | None - proceed                |
| [→]    | Inferred | Confirm before proceeding     |
| [?]    | Unknown  | Investigate before proceeding |

Rule: All items must be [✓] to proceed.

| Item          | Check Criteria                                      |
| ------------- | --------------------------------------------------- |
| Purpose       | Why needed + user's underlying intent               |
| Scope         | Identified target files/functions                   |
| Constraints   | Technical requirements + limitations + dependencies |
| Completion    | Done criteria + verification method                 |
| Context       | Existing code patterns understood                   |
| Components    | Affected areas + potential risks                    |
| Prerequisites | Confirmed tech stack/conventions                    |

Display format:

```text
🧠 Understanding: [███████░░░] 71% (5/7 verified)

┌─ Checklist ────────────────────────────────────
│ [✓] Purpose: {description}
│ [→] Scope: {description} ← confirm
│ [?] Constraints: {description} ← investigate
│ ...
└────────────────────────────────────────────────

⚡ Status: 🟢 Ready / 🟡 Needs confirmation / 🔴 Blocked
```

### Task Decomposition

Split when ANY threshold exceeded:

| Condition | Threshold |
| --------- | --------- |
| Files     | ≥5        |
| Features  | ≥3        |
| Layers    | ≥3        |
| Lines     | ≥200      |

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

### Team Structure

```text
/feature command (LEADER)
├── explorer-data    (feature-explorer, Data layer)
├── explorer-api     (feature-explorer, UI/API)
├── explorer-core    (feature-explorer, Core logic)
└── architect        (feature-architect, progressive mode)
```

### Workflow

| Step | Actor     | Action                                                                 |
| ---- | --------- | ---------------------------------------------------------------------- |
| 1    | Leader    | `TeamCreate("feature-{timestamp}")`                                    |
| 2    | Leader    | TaskCreate x 4 (explorer-data, explorer-api, explorer-core, architect) |
| 3    | Leader    | Spawn 4 teammates via Task with `team_name`                            |
| 4    | Explorers | Investigate assigned focus area, DM findings to `architect`            |
| 5    | Architect | Process explorer findings incrementally                                |
| 6    | Leader    | Wait for all explorers to complete                                     |
| 7    | Leader    | AskUserQuestion for clarification (edge cases, error handling, etc.)   |
| 8    | Leader    | SendMessage clarification answers to `architect`                       |
| 9    | Architect | Produce final architecture design                                      |
| 10   | Leader    | SendMessage `shutdown_request` to all teammates                        |

### Focus Assignment

| Teammate      | subagent_type    | Focus Area | Priority Directories               |
| ------------- | ---------------- | ---------- | ---------------------------------- |
| explorer-data | feature-explorer | Data layer | repos/, models/, schemas/, db/     |
| explorer-api  | feature-explorer | UI/API     | components/, api/, routes/, pages/ |
| explorer-core | feature-explorer | Core logic | services/, utils/, lib/, core/     |

Agent: [feature-explorer.md](../agents/explorers/feature-explorer.md)

### Architect Instructions

Spawn `architect` with progressive mode instructions in the Task prompt:

1. Start pattern analysis immediately (don't wait for explorers)
2. Incorporate explorer findings as they arrive via DM
3. After receiving Leader's clarification DM → produce final design
4. Evaluate 3 approaches: Minimal Changes, Clean Architecture, Pragmatic Balance

Agent: [feature-architect.md](../agents/architects/feature-architect.md)

### Post-Team

1. Present comparison table with recommendation
2. Ask preference (see Prompt: Design Choice)
3. If technical decision warrants → ask about ADR
4. Execute /think → Output: SOW + Spec

If user says "whatever you think is best" → Provide recommendation → Use Prompt: Delegation Confirm

## Phase 5: Implementation

### Parallel Decision

Read architect's Component Design → classify by Layer column → decide mode.

| Condition                          | Mode       | Action                      |
| ---------------------------------- | ---------- | --------------------------- |
| logic_files >= 2 AND ui_files >= 2 | Parallel   | Show Prompt: Impl Mode      |
| Otherwise                          | Sequential | Execute /code (skip prompt) |

### Layer Classification

| Layer  | Directories                                                                  |
| ------ | ---------------------------------------------------------------------------- |
| shared | types/, constants/, config/                                                  |
| logic  | hooks/, utils/, services/, api/, repos/, schemas/, lib/, store/, middleware/ |
| ui     | components/, pages/, layouts/, views/, styles/, css/                         |

### Parallel Mode

#### Team Structure

```text
/feature command (LEADER)
├── impl-logic  (unit-implementer, logic layer)
└── impl-ui     (unit-implementer, ui layer)
```

Agent: [unit-implementer.md](../agents/teams/unit-implementer.md)

#### Workflow

| Step | Actor  | Action                                                     |
| ---- | ------ | ---------------------------------------------------------- |
| 1    | Leader | Implement shared layer first (types/, constants/, config/) |
| 2    | Leader | `Task(test-generator)`: generate ALL tests in skip state   |
| 3    | Leader | Assign tests to layers (by implementation file directory)  |
| 4    | Leader | `TeamCreate("impl-{timestamp}")`                           |
| 5    | Leader | TaskCreate x 2 (impl-logic, impl-ui)                       |
| 6    | Leader | Spawn 2 teammates via Task with `team_name`                |
| 7    | Impls  | RGRC cycle for assigned tests, DM status to leader         |
| 8    | Leader | Wait for both implementers to complete                     |
| 9    | Leader | Fix cross-layer issues (imports, wiring)                   |
| 10   | Leader | Execute /test for full suite + quality gates               |
| 11   | Leader | SendMessage `shutdown_request` to all teammates            |

#### Implementer Task Prompt

Include in each implementer's Task prompt:

1. Unit assignment: `logic` or `ui`
2. Interface contracts from architect output
3. Assigned files (create + modify)
4. Assigned test files
5. Constraint: only modify assigned files

## Phase 6: Quality Review

1. Execute /audit → /test → /polish
2. Present findings, ask for triage (see Prompt: Issue Triage)
3. Address selected issues

## Phase 7: Validation

1. Execute /validate
2. IDR auto-generated via git commit hook
3. Present summary

## Prompts

All prompts use `multiSelect: false`.

### Phase 1: Feature Type

Options are generated from detected Context Pattern.

```yaml
# Claude Code config detected
question: "What would you like to add?"
header: "Feature Type"
options:
  - label: "Add command"
  - label: "Add skill"
  - label: "Add hook"
  - label: "Add agent"

# Fallback (no pattern matched)
question: "What type of feature?"
header: "Feature Type"
options:
  - label: "New Feature"
  - label: "Feature Extension"
  - label: "Refactoring"
```

### Phase 2-4: Design & Architecture

```yaml
# Design Choice
question: "Which architecture approach?"
header: "Design"
options:
  - label: "Pragmatic Balance (Recommended)"
  - label: "Minimal Changes"
  - label: "Clean Architecture"
  - label: "Review Details"

# ADR Creation
question: "Record as ADR?"
header: "ADR"
options:
  - label: "Create ADR"
  - label: "Skip"

# Delegation Confirm (when user defers decision)
question: "Recommended: [X]. Proceed?"
header: "Confirm"
options:
  - label: "Yes, proceed"
  - label: "No, explain options"
```

### Phase 5-6: Implementation & Quality

```yaml
# Impl Mode (shown only when Parallel Decision = Parallel)
question: "Implementation mode?"
header: "Impl Mode"
options:
  - label: "Parallel (Recommended)"
  - label: "Sequential"
  - label: "Revise Design"
  - label: "Have Questions"

# Issue Triage
question: "How to handle issues?"
header: "Triage"
options:
  - label: "Fix All"
  - label: "Fix Critical Only"
  - label: "Proceed As-Is"
  - label: "Review Individually"
```

## Verification

| Check                                       | Required |
| ------------------------------------------- | -------- |
| Explore team spawned with 4 teammates?      | Yes      |
| Architecture design produced?               | Yes      |
| User approved implementation?               | Yes      |
| Implementation completed (parallel or seq)? | Yes      |
| Quality gates pass after integration?       | Yes      |
| /audit passed (no critical issues)?         | Yes      |
| /validate succeeded?                        | Yes      |

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

## Resume

### SOW Discovery

1. Check `$HOME/.claude/workspace/.current-sow` for tracked SOW path
2. If not found → Glob for `$HOME/.claude/workspace/planning/*/sow.md`
3. If multiple SOWs → prompt user to select via AskUserQuestion
4. Read SOW metadata to determine resume point

### Resume Actions

| SOW Status          | Action                            |
| ------------------- | --------------------------------- |
| Phase N in-progress | Continue from last completed step |
| Phase N completed   | Start from Phase N+1              |
| No SOW found        | Start fresh from Phase 1          |

### State Tracking

SOW metadata fields for resume:

```yaml
status:
  current_phase: 4
  current_step: 2
  completed_phases: [1, 2, 3]
  exploration_summary: "..."
  clarification_answers: { ... }
  selected_architecture: "pragmatic"
  implementation_mode: "parallel"
```
