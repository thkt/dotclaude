# Phase 2-4: Team Exploration & Architecture

## Scope Tier

From Phase 1 file count (confirm after exploration):

| Tier   | Files | Team                        |
| ------ | ----- | --------------------------- |
| Small  | 1-3   | Leader explores + architect |
| Medium | 4-15  | 2 explorers + architect     |
| Large  | 16+   | 3 explorers + architect     |

User can request full team on any scope.

## Team Structure (Large)

```text
/feature command (LEADER)
├── explorer-data    (feature-explorer, Data layer)
├── explorer-api     (feature-explorer, UI/API)
├── explorer-core    (feature-explorer, Core logic)
└── architect        (feature-architect, progressive mode)
```

Medium: Drop `explorer-core`, merge Core into `explorer-data`.
Small: Leader explores directly, spawns `architect` only.

## Seed Context

Glob for `.analysis/architecture.yaml` in project root. If found, include in explorer Task prompts.

> Architecture data as seed context. Verify independently, do not assume current.

## Workflow

| Step | Actor     | Action                                                                          |
| ---- | --------- | ------------------------------------------------------------------------------- |
| 1    | Leader    | `TeamCreate("feature-{timestamp}")`                                             |
| 2    | Leader    | Read seed context (see Seed Context above)                                      |
| 3    | Leader    | TaskCreate (tier-dependent: Large x4, Medium x3, Small x1)                      |
| 4    | Leader    | Spawn teammates via Task with `team_name` (include seed in prompt)              |
| 5    | Explorers | Investigate assigned focus area                                                 |
| 6    | Explorers | Council sharing round (see Council Protocol below)                              |
| 7    | Explorers | DM enriched findings to `architect`                                             |
| 8    | Architect | Process explorer findings incrementally                                         |
| 9    | Leader    | Wait for explorers. If incomplete after leader's own tasks finish, absorb scope |
| 10   | Leader    | AskUserQuestion for clarification (edge cases, error handling)                  |
| 11   | Leader    | SendMessage clarifications to `architect`                                       |
| 12   | Architect | Produce final architecture design                                               |
| 13   | Leader    | SendMessage `shutdown_request` to all teammates                                 |

## Focus Assignment

| Teammate      | subagent_type    | Focus Area | Priority Directories               |
| ------------- | ---------------- | ---------- | ---------------------------------- |
| explorer-data | feature-explorer | Data layer | repos/, models/, schemas/, db/     |
| explorer-api  | feature-explorer | UI/API     | components/, api/, routes/, pages/ |
| explorer-core | feature-explorer | Core logic | services/, utils/, lib/, core/     |

Agent: [feature-explorer.md](../../../agents/explorers/feature-explorer.md)

## Explorer Completion Criteria

Each explorer must DM architect with:

| Deliverable       | Description                                   |
| ----------------- | --------------------------------------------- |
| Files analyzed    | List of files read with key findings per file |
| Patterns found    | Existing patterns relevant to the feature     |
| Constraints       | Technical limitations or dependencies         |
| Cross-layer notes | Discoveries shared via Council (P1/P2 items)  |

Leader validates: zero files analyzed → re-assign or absorb.

## Council Protocol: Explorer Council

Explorers share cross-layer discoveries with peers before reporting to architect:

### Layer Priority (conflict resolution)

Upstream overrides downstream:

| Priority | Layer | Rationale                     |
| -------- | ----- | ----------------------------- |
| 1        | Data  | Schema shapes all above       |
| 2        | Core  | Business logic constrains API |
| 3        | API   | UI adapts to both             |

### Communication Priorities

| Priority | Trigger                           | Action                          |
| -------- | --------------------------------- | ------------------------------- |
| P1       | Assumption-changing discovery     | DM to both peers immediately    |
| P2       | Unexpected cross-layer dependency | DM to relevant peer             |
| Skip     | Standard pattern within own layer | Don't share — own findings only |

## Architect Instructions

Spawn `architect` with progressive mode:

1. Start pattern analysis immediately (don't wait for explorers)
2. Incorporate explorer findings as they arrive via DM
3. After Leader's clarification DM → produce final design
4. Compose from explorer insights (not predefined templates)

Agent: [feature-architect.md](../../../agents/architects/feature-architect.md)

## Post-Team

1. Present architecture with explorer insight traceability
2. Ask for review (Prompts reference)
3. If technical decision warrants → ask about ADR
4. Execute /think → Output: SOW + Spec
5. Write `architecture` section to handoff.yaml (components, contracts, sow/spec paths)

User says "whatever you think is best" → proceed → Prompt: Delegation Confirm

## Error Handling

See the Error Handling section in `/feature`.
