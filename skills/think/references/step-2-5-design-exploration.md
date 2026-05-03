# Steps 2-5: Design Exploration

## Step 2: Codebase Exploration

Read relevant code. Check `.claude/workspace/research/` for recent research output. If a relevant file exists, read it to inherit prior investigation context. Understand patterns, constraints, architecture, and prior art.

## Step 3: Approach Generation

Generate ≥2 distinct approaches from the perspectives below. When approaches contain independent technical decisions (e.g., framework, state management, API style), present each as a separate choice question (1 question per message, with recommendation and impact). Bundle only decisions that are tightly coupled.

| Perspective | Question                                   |
| ----------- | ------------------------------------------ |
| Pragmatist  | What's the simplest solution that works?   |
| Architect   | What's extensible and well-structured?     |
| DX Advocate | What's best for developer/user experience? |

<!-- canonical: rules/core/PREFLIGHT.md (decomposition thresholds) -->

Decomposition unit: 1 AC (outcome) = 1 Unit. Each Unit traces to a single acceptance criterion from the Why Outcome and gets its own SOW/Spec, runnable via `/code`. Within a Unit, split further if any structural threshold is exceeded (Files ≥ 5, Features ≥ 3, Layers ≥ 3). These are hard rules to keep cognitive load and scope tractable. Lines from PREFLIGHT.md is an effort metric and is intentionally not used here.

## Step 4: Design Challenge

Spawn `critic-design` agent (background) against the approaches from Step 3. The agent collects its own context via Read/ugrep/bfs.

Present DA results with verdict table + actionable items. Revise approaches based on findings before proceeding to Step 5.

## Step 5: Design Composition

Compose optimal design from surviving approaches. Work through two perspectives in order:

### 5-1. Domain Perspective (What)

Technology-independent business logic modeling. Include only what the Why Outcome demands. Concepts that an AC traces to. Skip entries with no AC link.

```markdown
### Domain Perspective

- Entities: [concepts an AC depends on]
- Business Rules: [rules an AC depends on]
- Invariants: [conditions an AC depends on]
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

### Trade-offs

| Accepted           | Rejected          | Why         |
| ------------------ | ----------------- | ----------- |
| [what we're doing] | [what we gave up] | [rationale] |
```
