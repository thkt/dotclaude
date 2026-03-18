---
name: think
description: Design exploration with SOW and Spec generation. Use when user mentions
  計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration. Do
  NOT use for codebase investigation without planning intent (use /research
  instead).
allowed-tools: Read, Write, Glob, Grep, LS, Task, TaskCreate, TaskList, AskUserQuestion
model: opus
argument-hint: "[task description]"
user-invocable: true
---

# /think

Deep design exploration. Compare approaches, validate assumptions, generate SOW
and Spec.

## Rationalization Counters

| Excuse                                     | Counter                                                                          |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| "Why is obvious, I'll skip it"             | Obvious to whom? Unexamined Why produces silent decisions downstream             |
| "Self-challenge is overkill for this"      | List 3 assumptions in the leading approach. If any is unverified, Step 4 applies |
| "The user's request maps directly to code" | Requests describe symptoms. Name the underlying problem before designing         |

## Input

Task description from `$1`, research context, or AskUserQuestion if empty.

## Execution

| Step | Action               | Output                                          |
| ---- | -------------------- | ----------------------------------------------- |
| 0    | Why Discovery        | Why Statement (outcome, stakeholders, evidence) |
| 1    | Q&A Clarification    | Scope, constraints, risks (if needed)           |
| 2    | Codebase exploration | Relevant code, patterns, constraints            |
| 3    | Approach generation  | ≥2 approaches with trade-offs                   |
| 4    | Self-challenge       | Weaknesses exposed, assumptions validated       |
| 5    | Design composition   | Optimal design with traceability                |
| 6    | User Review          | Approved design (with trade-off rationale)      |
| 6.5  | ADR Proposal         | (if needed)                                     |
| 7    | SOW Generation       | sow.md                                          |
| 8    | Spec Generation      | spec.md                                         |
| 9    | sow-spec-reviewer    | Auto if FR ≥ 5 or multi-domain; else optional   |
| 10   | Task Decomposition   | Milestones + TaskCreate + First Move            |

## Why Discovery (Step 0)

### Step 0: Why Discovery

Before exploring code or generating approaches, establish the outcome this work
must achieve. Why does not emerge unless explicitly demanded.

| Question                | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| Who needs this?         | Stakeholder/user identification          |
| What pain exists?       | Evidence of the problem (not assumption) |
| What outcome = success? | Measurable result (not deliverable)      |
| Why now?                | Priority justification                   |
| What if we don't?       | Cost of inaction                         |

Output: Why Statement

```markdown
## Why

- For: [who]
- Problem: [evidence-based pain point]
- Outcome: [what success looks like — a result, not a feature]
- Urgency: [why now, not later]
- Inaction cost: [what happens if we skip this]
```

Gate: Do not proceed to Step 1 until the Why Statement is clear.

If any field is vague or assumed, do not fill in placeholders and move on.
Instead, engage the user in back-and-forth dialogue:

- Surface what you think the Why might be, and ask the user to confirm or correct
- Challenge vague outcomes ("improve UX" → for whom? measured how?)
- Offer contrasting framings to help the user articulate what they actually mean
- Keep asking until the user confirms the Why Statement

This is a wall-bouncing session, not a one-shot question. The goal is to draw out
what the user already knows but has not yet articulated.

## Design Exploration (Steps 2-5)

### Step 2: Codebase Exploration

Read relevant code. Check `.claude/workspace/research/` for recent research
output — if a relevant file exists, read it to inherit prior investigation
context. Understand patterns, constraints, architecture, and prior art.

### Step 3: Approach Generation

Generate ≥2 distinct approaches from different perspectives:

- Pragmatist: What's the simplest solution that works?
- Architect: What's extensible and well-structured?
- DX Advocate: What's best for developer/user experience?

<!-- canonical: rules/core/PRE_TASK_CHECK.md (decomposition thresholds) -->

If PRE_TASK_CHECK decomposition thresholds are exceeded (Files ≥ 5, Features ≥
3, Layers ≥ 3), decompose into independent Units. Each Unit gets its own
SOW/Spec and can be implemented separately via `/code`.

### Step 4: Self-Challenge

For each approach:

- What assumptions are hidden?
- What's the hidden cost?
- How does this fail?
- Is a simpler option missed?

### Step 5: Design Composition

Compose optimal design from surviving approaches. Work through two perspectives
in order:

#### 5-1. Domain Perspective (What)

Technology-independent business logic modeling. Depth varies by context:

| Context                                           | Depth    | Focus                                                              |
| ------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| Business app (entities ≥ 3 or business rules ≥ 3) | Detailed | Entities, relationships, invariants, business rules, domain events |
| CLI tool / config / simple UI                     | Brief    | Key data structures and validation rules only                      |

```markdown
### Domain Perspective

- Entities: [key data types and their relationships]
- Business Rules: [domain-specific rules and constraints]
- Invariants: [conditions that must always hold]
```

#### 5-2. Technical Perspective (How)

Translate domain understanding into implementation design:

```markdown
### Technical Perspective

- Component Architecture: [hierarchy, boundaries, responsibilities]
- State Strategy: [server state vs client state, management approach]
- NFR Application: [performance, security, accessibility patterns]
- Operational Concerns: [error boundaries, logging, loading states]
```

#### Combined Output

```markdown
## Design

### Key Decisions

| Decision | Choice | Rationale               |
| -------- | ------ | ----------------------- |
| ...      | ...    | traces to [perspective] |

### Implementation Sketch

- Files to modify: [list with file:line]
- Files to create: [list with purpose]
- Estimated scope: [lines, files]

### Trade-offs

| Accepted           | Rejected          | Why         |
| ------------------ | ----------------- | ----------- |
| [what we're doing] | [what we gave up] | [rationale] |
```

## Document Generation (Steps 7-8)

### Step 7: SOW

Read template `templates/sow/template.md`. Fill from design context (Steps 0-6).
ID format: AC-N. Output:
`.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md`

### Step 8: Spec

Read template `templates/spec/template.md`. Generate from SOW. ID format:
FR-001, T-001, NFR-001. Traceability: `FR-001 Implements: AC-001` →
`T-001 Validates: FR-001` If UI-related: include Component API (Props, variants,
states, usage). Output: `.claude/workspace/planning/[same-dir]/spec.md`

## Spec Review (Step 9)

After Spec generation, check auto-invoke conditions:

| Condition         | Action                                 |
| ----------------- | -------------------------------------- |
| FR ≥ 5 in Spec    | Auto-invoke sow-spec-reviewer          |
| Multi-domain Spec | Auto-invoke sow-spec-reviewer          |
| Neither condition | Offer as optional ("Run spec review?") |

On auto-invoke: score ≥ 90 → pass. Score < 90 → fix findings, re-invoke (max 3
loops). After 3 loops, present remaining findings to user and proceed.

## ADR Proposal (Step 6.5)

After user approves design, ask if an ADR is needed for technical decisions
(framework/library selection, architecture patterns, deprecations, trade-off
choices). Skip for simple features.

## Task Decomposition (Step 10)

### Principles

| Principle              | Rule                                            |
| ---------------------- | ----------------------------------------------- |
| Sub-deadlines required | Phase-level milestones with completion criteria |
| Parallel grouping      | Never 1 task per phase if parallelizable        |
| First move explicit    | State which task to start and why               |
| Scope cut = leaf only  | Core dependency tasks are non-negotiable        |
| No urgency panic       | Analyze structurally, not reactively            |

### TaskCreate

Cross-session: `export CLAUDE_CODE_TASK_LIST_ID="[feature]-tasks"` (max 10
tasks)

| Source              | subject                  | description              | addBlockedBy     |
| ------------------- | ------------------------ | ------------------------ | ---------------- |
| Implementation Plan | `Phase N: [description]` | Steps + validates AC-XXX | [dependency IDs] |
| Test Plan (HIGH)    | `Test: [description]`    | (if complex)             | [dependency IDs] |

### Scope Validation

Before creating tasks, count unique files per Phase in the Implementation Plan.
Split any Phase with Files ≥ 5 into independent Units (each gets own SOW/Spec).
Repeat until all Phases have Files < 5.

### Milestone Summary

```text
Phase 1 [Day X]: task list (completion criteria)
Phase 2 [Day Y]: ...
```

### First Move

→ Task N: [rationale — why this unblocks the most downstream work]

### Scope Cut Candidates

Leaf tasks only. Core dependencies are non-negotiable.

## Q&A Categories (Step 1)

Scope, Priority (MoSCoW), Constraints, Risks.

Purpose, Users, and Success criteria are covered by Step 0 (Why Discovery).

## Output

Always use this exact path — Write tool creates parent directories if absent.

`.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` and `spec.md`

## Verification

All steps must complete: Why established, codebase explored, ≥2 approaches
compared, self-challenge applied, design composed, user reviewed, sow.md and
spec.md generated, tasks decomposed (milestones + first move + scope cut
candidates).
