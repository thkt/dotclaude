---
description: Comprehensive feature development with exploration, architecture, TDD, and quality gates
allowed-tools: SlashCommand, Read, Write, Glob, Grep, LS, Task, TaskCreate, TaskList, TaskUpdate, AskUserQuestion
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

| Phase | Name           | Action                          | User Checkpoint       |
| ----- | -------------- | ------------------------------- | --------------------- |
| 1     | Discovery      | Context scan → PRE_TASK_CHECK   | [?] or [→] resolution |
| 2     | Exploration    | feature-explorer ×3 parallel    | Summary review        |
| 3     | Clarification  | AskUserQuestion for ambiguities | Answer collection     |
| 4     | Architecture   | feature-architect ×3 → /think   | Approach selection    |
| 5     | Implementation | /code (TDD/RGRC)                | Approval before start |
| 6     | Quality        | /audit → /test → /polish        | Issue triage          |
| 7     | Validation     | /validate → Summary             | Completion            |

## Phase 1: Discovery

### Steps

1. Quick context scan (detect project type before prompting)
   - Check CLAUDE.md, package.json, Cargo.toml, pyproject.toml, etc.
   - Match against Context Patterns
2. If `$ARGUMENTS` empty → prompt with context-aware options
3. Execute Understanding Check (see below)
4. If any [→] or [?] → resolve via AskUserQuestion
5. Create todos via TaskCreate (Phase 2, 4, 5, 6, 7 — Phase 3 is user checkpoint, not tracked)

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

## Phase 2: Codebase Exploration

1. Launch 3 agents via `Task` with `subagent_type: feature-explorer`
2. Each agent focuses on different layer (see Focus Assignment)
3. Read identified files (5-10 per agent)
4. Present merged summary

### Focus Assignment

| Agent | Focus Area | Priority Directories               |
| ----- | ---------- | ---------------------------------- |
| 1     | Data layer | repos/, models/, schemas/, db/     |
| 2     | UI/API     | components/, api/, routes/, pages/ |
| 3     | Core logic | services/, utils/, lib/, core/     |

Agent: [feature-explorer.md](../agents/explorers/feature-explorer.md)

## Phase 3: Clarifying Questions

1. Review Phase 2 findings
2. Identify unclear aspects (edge cases, error handling, integration, compatibility, performance)
3. Present questions via AskUserQuestion
4. Wait for all answers

If user says "whatever you think is best" → Provide recommendation → Use Prompt: Delegation Confirm

## Phase 4: Architecture Design

1. Launch 3 agents via `Task` with `subagent_type: feature-architect`
2. Each agent evaluates different approach (see Approach Assignment)
3. Present comparison table with recommendation
4. Ask preference (see Prompt: Design Choice)
5. If technical decision warrants → ask about ADR
6. Execute /think → Output: SOW + Spec

### Approach Assignment

| Agent | Approach           | Evaluation Focus              |
| ----- | ------------------ | ----------------------------- |
| 1     | Minimal Changes    | Maximum reuse, smallest diff  |
| 2     | Clean Architecture | Maintainability, abstractions |
| 3     | Pragmatic Balance  | Speed + quality trade-off     |

Agent: [feature-architect.md](../agents/architects/feature-architect.md)

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

## Error Handling

| Condition              | Action                                    |
| ---------------------- | ----------------------------------------- |
| Agent timeout          | Continue with completed agents            |
| /code failure          | Present error, ask for guidance           |
| /audit critical issues | Block Phase 7 until resolved              |
| User cancellation      | Save current phase + step to SOW metadata |

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
