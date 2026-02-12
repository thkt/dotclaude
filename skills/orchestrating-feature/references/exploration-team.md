# Phase 2-4: Team Exploration & Architecture

## Scope Tier

Estimate from Phase 1 file count. Confirm after exploration.

| Tier   | Files | Team                        |
| ------ | ----- | --------------------------- |
| Small  | 1-3   | Leader explores + architect |
| Medium | 4-15  | 2 explorers + architect     |
| Large  | 16+   | 3 explorers + architect     |

User can request full team on small scope.

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

Glob for `.analysis/architecture.yaml` in project root. If exists, include in explorer Task prompts as seed with instruction:

> Architecture data as seed context. Verify independently, do not assume current.

## Workflow

| Step | Actor     | Action                                                                 |
| ---- | --------- | ---------------------------------------------------------------------- |
| 1    | Leader    | `TeamCreate("feature-{timestamp}")`                                    |
| 1.5  | Leader    | Read seed context (see Seed Context above)                             |
| 2    | Leader    | TaskCreate x 4 (explorer-data, explorer-api, explorer-core, architect) |
| 3    | Leader    | Spawn 4 teammates via Task with `team_name` (include seed in prompt)   |
| 4    | Explorers | Investigate assigned focus area                                        |
| 4b   | Explorers | Council sharing round (see Council Protocol below)                     |
| 4c   | Explorers | DM enriched findings to `architect`                                    |
| 5    | Architect | Process explorer findings incrementally                                |
| 6    | Leader    | Wait for all explorers to complete                                     |
| 7    | Leader    | AskUserQuestion for clarification (edge cases, error handling, etc.)   |
| 8    | Leader    | SendMessage clarification answers to `architect`                       |
| 9    | Architect | Produce final architecture design                                      |
| 10   | Leader    | SendMessage `shutdown_request` to all teammates                        |

## Focus Assignment

| Teammate      | subagent_type    | Focus Area | Priority Directories               |
| ------------- | ---------------- | ---------- | ---------------------------------- |
| explorer-data | feature-explorer | Data layer | repos/, models/, schemas/, db/     |
| explorer-api  | feature-explorer | UI/API     | components/, api/, routes/, pages/ |
| explorer-core | feature-explorer | Core logic | services/, utils/, lib/, core/     |

Agent: [feature-explorer.md](../../../agents/explorers/feature-explorer.md)

## Council Protocol: Explorer Council

Explorers share cross-layer discoveries with peers before reporting to architect.

### Layer Priority (conflict resolution)

When findings conflict, upstream constraints override downstream:

| Priority | Layer | Rationale                     |
| -------- | ----- | ----------------------------- |
| 1        | Data  | Schema shapes all above       |
| 2        | Core  | Business logic constrains API |
| 3        | API   | UI adapts to both             |

### Communication Priorities (what to share)

| Priority | Trigger                           | Action                          |
| -------- | --------------------------------- | ------------------------------- |
| P1       | Assumption-changing discovery     | DM to both peers immediately    |
| P2       | Unexpected cross-layer dependency | DM to relevant peer             |
| Skip     | Standard pattern within own layer | Don't share — own findings only |

## Architect Instructions

Spawn `architect` with progressive mode instructions in the Task prompt:

1. Start pattern analysis immediately (don't wait for explorers)
2. Incorporate explorer findings as they arrive via DM
3. After receiving Leader's clarification DM → produce final design
4. Compose architecture from explorer insights (don't pick from predefined templates)

Agent: [feature-architect.md](../../../agents/architects/feature-architect.md)

## Post-Team

1. Present composed architecture with traceability to explorer insights
2. Ask for review (see Prompts reference)
3. If technical decision warrants → ask about ADR
4. Execute /think → Output: SOW + Spec

If user says "whatever you think is best" → Proceed with composed architecture → Use Prompt: Delegation Confirm
