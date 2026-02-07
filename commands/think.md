---
description: Orchestrate SOW and Spec generation for comprehensive planning
allowed-tools: Skill, Read, Write, Glob, Task, TaskCreate, TaskList, AskUserQuestion, TeamCreate, SendMessage
model: opus
argument-hint: "[task description]"
---

# /think - Planning Orchestrator

Orchestrate implementation planning with multi-perspective design exploration, SOW and Spec generation.

## Input

- Task description: `$1` (optional)
- If `$1` is empty → use research context or prompt via AskUserQuestion

## Execution

| Step | Action                                  | Output                                     |
| ---- | --------------------------------------- | ------------------------------------------ |
| 0    | Q&A Clarification                       | (if unclear)                               |
| 1    | Spawn think team                        | Team of 5 agents                           |
| 2    | Thinkers explore approaches             | 3 proposals from different perspectives    |
| 3    | Challenger validates proposals          | Challenged proposals with weaknesses       |
| 4    | Synthesizer produces comparison         | Comparison table + recommendation          |
| 5    | User Selection                          | chosen approach (with trade-off rationale) |
| 5.5  | ADR Proposal                            | (if needed)                                |
| 6    | /sow                                    | sow.md                                     |
| 7    | /spec                                   | spec.md                                    |
| 8    | sow-spec-reviewer (≥90)                 | (optional)                                 |
| 9    | SOW → Todos                             | TaskCreate                                 |

## Team Workflow (Steps 1-4)

Spawn a coordinated team of 3 thinkers, 1 challenger, and 1 synthesizer.

### Team Structure

```text
/think command (LEADER)
├── thinker-pragmatist   (thinker-pragmatist)
├── thinker-architect    (thinker-architect)
├── thinker-advocate     (thinker-advocate)
├── challenger           (devils-advocate)
└── synthesizer          (think-synthesizer)
```

### Workflow

| Step | Actor       | Action                                                          |
| ---- | ----------- | --------------------------------------------------------------- |
| 1    | Leader      | `TeamCreate("think-{timestamp}")`                               |
| 2    | Leader      | TaskCreate x 5 (3 thinkers + challenger + synthesizer)          |
| 3    | Leader      | Spawn 5 teammates via Task with `team_name`                     |
| 4    | Thinkers    | Explore codebase, DM proposal to `challenger`                   |
| 5    | Challenger  | Challenge each proposal, DM challenged results to `synthesizer` |
| 6    | Leader      | Wait for all thinkers to complete                               |
| 7    | Synthesizer | Produce comparison table + recommendation, DM to leader         |
| 8    | Leader      | Present synthesis to user for selection                         |
| 9    | Leader      | SendMessage `shutdown_request` to all teammates                 |

### Teammate Spawn

| Teammate           | subagent_type      | Role                                          |
| ------------------ | ------------------ | --------------------------------------------- |
| thinker-pragmatist | thinker-pragmatist | Simplicity, shipping speed, YAGNI             |
| thinker-architect  | thinker-architect  | Extensibility, patterns, clean design         |
| thinker-advocate   | thinker-advocate   | User/developer experience, API ergonomics     |
| challenger         | devils-advocate    | Challenge proposals, expose hidden weaknesses |
| synthesizer        | think-synthesizer  | Integrate challenged proposals, recommend     |

Agents: [agents/thinkers/](../agents/thinkers/), [agents/critics/](../agents/critics/), [agents/teams/](../agents/teams/)

### Error Handling

| Error               | Recovery                                                      |
| ------------------- | ------------------------------------------------------------- |
| Team creation fails | Fall back to single-agent design exploration (original flow)  |
| Thinker spawn fails | Continue with remaining thinkers                              |
| Thinker timeout     | 120s; Leader proceeds with available proposals                |
| Challenger fails    | Leader passes proposals directly to synthesizer               |
| Synthesizer fails   | Leader synthesizes using think-synthesizer.md output template |
| All teammates fail  | Fall back to single-agent design exploration                  |

## Complexity Gate

Skip team workflow for simple tasks:

| Condition                   | Action                              |
| --------------------------- | ----------------------------------- |
| Single file change          | Skip team, single-agent exploration |
| Obvious implementation path | Skip team, proceed to /sow directly |
| User says "just plan it"    | Skip team, single-agent exploration |
| Multi-file or unclear path  | Use team workflow                   |

## ADR Proposal (Step 5.5)

After user selects an approach, evaluate if an ADR is warranted.

| Condition               | Action                                           |
| ----------------------- | ------------------------------------------------ |
| Technical decision made | AskUserQuestion: "Create an ADR?" → Yes → `/adr` |
| Simple feature addition | Skip                                             |

ADR-worthy decisions:

- Framework/library selection
- Architecture pattern choice
- Deprecation decisions
- Trade-off decisions between multiple valid options

## Todo Generation (Step 9)

Cross-session: `export CLAUDE_CODE_TASK_LIST_ID="[feature]-tasks"` (max 10 tasks)

| Source              | subject                  | description              | activeForm        |
| ------------------- | ------------------------ | ------------------------ | ----------------- |
| Implementation Plan | `Phase N: [description]` | Steps + validates AC-XXX | `[description]中` |
| Test Plan (HIGH)    | `Test: [description]`    | (if complex)             | `[description]中` |

## Q&A Categories

| Category    | Focus                         |
| ----------- | ----------------------------- |
| Purpose     | Goal, problem, beneficiary    |
| Users       | Primary users                 |
| Scope       | Included/excluded             |
| Priority    | MoSCoW                        |
| Success     | "Done" definition             |
| Constraints | Technical, time, dependencies |
| Risks       | Known concerns                |

## Output

```text
$HOME/.claude/workspace/planning/YYYY-MM-DD-[feature]/
├── sow.md     # Statement of Work
└── spec.md    # Specification
```

## Verification

| Check                               | Required |
| ----------------------------------- | -------- |
| Think team spawned with 5 teammates?| Yes      |
| Synthesis comparison produced?      | Yes      |
| User selected approach?             | Yes      |
| sow.md generated?                   | Yes      |
| spec.md generated?                  | Yes      |
| Todos created (TaskCreate)?         | Yes      |
