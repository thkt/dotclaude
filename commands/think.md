---
description: Design exploration with SOW and Spec generation. Use when user mentions 計画して, 設計して, アプローチ検討, 方針決め, planning, design exploration.
allowed-tools: Read, Write, Glob, Grep, LS, Task, TaskCreate, TaskList, AskUserQuestion
model: opus
argument-hint: "[task description]"
---

# /think

Deep design exploration. Compare approaches, validate assumptions, generate SOW and Spec.

## Input

Task description from `$1`, research context, or AskUserQuestion if empty.

## Execution

| Step | Action               | Output                                     |
| ---- | -------------------- | ------------------------------------------ |
| 0    | Q&A Clarification    | (if unclear)                               |
| 1    | Codebase exploration | Relevant code, patterns, constraints       |
| 2    | Approach generation  | ≥2 approaches with trade-offs              |
| 3    | Self-challenge       | Weaknesses exposed, assumptions validated  |
| 4    | Design composition   | Optimal design with traceability           |
| 5    | User Review          | Approved design (with trade-off rationale) |
| 5.5  | ADR Proposal         | (if needed)                                |
| 6    | SOW Generation       | sow.md                                     |
| 7    | Spec Generation      | spec.md                                    |
| 8    | sow-spec-reviewer    | (optional, ≥90/100 to pass)                |
| 9    | SOW → Todos          | TaskCreate                                 |

## Design Exploration (Steps 1-4)

### Step 1: Codebase Exploration

Read relevant code. Check `.analysis/architecture.yaml` if exists. Also check `.claude/workspace/research/` for recent research output — if a relevant file exists, read it to inherit prior investigation context. Understand patterns, constraints, architecture, and prior art.

### Step 2: Approach Generation

Generate ≥2 distinct approaches from different perspectives:

- Pragmatist: What's the simplest solution that works?
- Architect: What's extensible and well-structured?
- DX Advocate: What's best for developer/user experience?

If PRE_TASK_CHECK decomposition thresholds are exceeded (Files ≥ 5, Features ≥ 3, Layers ≥ 3), consider decomposing into independent Units. Each Unit gets its own SOW/Spec and can be implemented separately via `/code`.

### Step 3: Self-Challenge

For each approach:

- What assumptions are hidden?
- What's the hidden cost?
- How does this fail?
- Is a simpler option missed?

### Step 4: Design Composition

Compose optimal design from surviving approaches. Work through two perspectives in order:

#### 4-1. Domain Perspective (What)

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

#### 4-2. Technical Perspective (How)

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

## Document Generation (Steps 6-7)

### Step 6: SOW

Read template `templates/sow/template.md`. Fill from design context (Steps 1-5). ID format: AC-N.
Output: `.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md`

### Step 7: Spec

Read template `templates/spec/template.md`. Generate from SOW. ID format: FR-001, T-001, NFR-001.
Traceability: `FR-001 Implements: AC-001` → `T-001 Validates: FR-001`
If UI-related: include Component API (Props, variants, states, usage).
Output: `.claude/workspace/planning/[same-dir]/spec.md`

## ADR Proposal (Step 5.5)

After user approves design, ask if an ADR is needed for technical decisions (framework/library selection, architecture patterns, deprecations, trade-off choices). Skip for simple features.

## Todo Generation (Step 9)

Cross-session: `export CLAUDE_CODE_TASK_LIST_ID="[feature]-tasks"` (max 10 tasks)

| Source              | subject                  | description              | activeForm        |
| ------------------- | ------------------------ | ------------------------ | ----------------- |
| Implementation Plan | `Phase N: [description]` | Steps + validates AC-XXX | `[description]中` |
| Test Plan (HIGH)    | `Test: [description]`    | (if complex)             | `[description]中` |

## Q&A Categories

Purpose, Users, Scope, Priority (MoSCoW), Success criteria, Constraints, Risks.

## Output

Always use this exact path — Write tool creates parent directories if absent.

`.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` and `spec.md`

## Verification

All steps must complete: codebase explored, ≥2 approaches compared, self-challenge applied, design composed, user reviewed, sow.md and spec.md generated, todos created.
