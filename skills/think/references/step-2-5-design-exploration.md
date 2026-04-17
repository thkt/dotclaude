# Steps 2-5: Design Exploration

## Step 2: Codebase Exploration

Read relevant code. Check `.claude/workspace/research/` for recent research
output — if a relevant file exists, read it to inherit prior investigation
context. Understand patterns, constraints, architecture, and prior art.

## Step 3: Approach Generation

Generate ≥2 distinct approaches from different perspectives:

- Pragmatist: What's the simplest solution that works?
- Architect: What's extensible and well-structured?
- DX Advocate: What's best for developer/user experience?

When the approaches contain independent technical decisions (e.g., framework,
state management, API style), present each decision as a separate choice
question — 1 question per message, with recommendation and impact on the
project. Bundle only decisions that are tightly coupled.

<!-- canonical: rules/core/PRE_TASK_CHECK.md (decomposition thresholds) -->

If PRE_TASK_CHECK decomposition thresholds are exceeded (Files ≥ 5, Features ≥
3, Layers ≥ 3), decompose into independent Units. Each Unit gets its own
SOW/Spec and can be implemented separately via `/code`.

## Step 4: Design Challenge

Spawn `devils-advocate-design` agent (background) against the approaches from
Step 3. The agent collects its own context via Read/Grep/Glob.

Present DA results with verdict table + actionable items. Revise approaches
based on findings before proceeding to Step 5.

## Step 5: Design Composition

Compose optimal design from surviving approaches. Work through two perspectives
in order:

### 5-1. Domain Perspective (What)

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

### 5-2. Technical Perspective (How)

Translate domain understanding into implementation design:

```markdown
### Technical Perspective

- Component Architecture: [hierarchy, boundaries, responsibilities]
- State Strategy: [server state vs client state, management approach]
- NFR Application: [performance, security, accessibility patterns]
- Operational Concerns: [error boundaries, logging, loading states]
```

### Combined Output

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
