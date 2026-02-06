---
description: Comprehensive feature development with exploration, architecture, TDD, and quality gates
allowed-tools: SlashCommand, Read, Write, Glob, Grep, LS, Task, TaskCreate, TaskList, TaskUpdate, AskUserQuestion, Teammate, SendMessage
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
| 5     | Implementation | /code (TDD/RGRC)                             | Approval before start    |
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

Spawn a coordinated team of 3 explorers and 1 architect for parallel exploration with progressive architecture design.

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
| 1    | Leader    | `Teammate.spawnTeam("feature-{timestamp}")`                            |
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

1. Ask for approval (see Prompt: Start Implementation)
2. On approval → Execute /code

## Phase 6: Quality Review

1. Execute /audit → /test → /polish
2. Present findings, ask for triage (see Prompt: Issue Triage)
3. Address selected issues

## Phase 7: Validation

1. Execute /validate
2. IDR auto-generated via git commit hook
3. Present summary

## Prompts

### Feature Type

Options generated from detected Context Pattern.

#### Claude Code Config

```yaml
question: "What would you like to add?"
header: "Feature Type"
multiSelect: false
options:
  - label: "Add command"
  - label: "Add skill"
  - label: "Add hook"
  - label: "Add agent"
```

#### Fallback

```yaml
question: "What type of feature?"
header: "Feature Type"
multiSelect: false
options:
  - label: "New Feature"
  - label: "Feature Extension"
  - label: "Refactoring"
```

### Design Choice

```yaml
question: "Which architecture approach?"
header: "Design"
multiSelect: false
options:
  - label: "Pragmatic Balance (Recommended)"
  - label: "Minimal Changes"
  - label: "Clean Architecture"
  - label: "Review Details"
```

### ADR Creation

```yaml
question: "Record as ADR?"
header: "ADR"
multiSelect: false
options:
  - label: "Create ADR"
  - label: "Skip"
```

### Start Implementation

```yaml
question: "Ready to start?"
header: "Implement"
multiSelect: false
options:
  - label: "Start"
  - label: "Revise Design"
  - label: "Have Questions"
```

### Issue Triage

```yaml
question: "How to handle issues?"
header: "Triage"
multiSelect: false
options:
  - label: "Fix All"
  - label: "Fix Critical Only"
  - label: "Proceed As-Is"
  - label: "Review Individually"
```

### Delegation Confirm

```yaml
question: "Recommended: [recommendation]. Proceed?"
header: "Confirm"
multiSelect: false
options:
  - label: "Yes, proceed"
  - label: "No, explain options"
```

## Verification

| Check                               | Required |
| ----------------------------------- | -------- |
| Team spawned with 4 teammates?      | Yes      |
| Architecture design produced?       | Yes      |
| User approved implementation?       | Yes      |
| /code completed successfully?       | Yes      |
| /audit passed (no critical issues)? | Yes      |
| /validate succeeded?                | Yes      |

## Error Handling

| Condition              | Action                                         |
| ---------------------- | ---------------------------------------------- |
| Team creation fails    | Log error, report partial results              |
| Teammate spawn fails   | Continue with remaining teammates              |
| Teammate unresponsive  | shutdown_request → proceed with available data |
| DM delivery fails      | Retry once, then leader passes data directly   |
| /code failure          | Present error, ask for guidance                |
| /audit critical issues | Block Phase 7 until resolved                   |
| User cancellation      | Save current phase + step to SOW metadata      |

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
```
