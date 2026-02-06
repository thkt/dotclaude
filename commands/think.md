---
description: Orchestrate SOW and Spec generation for comprehensive planning
allowed-tools: Skill, Read, Write, Glob, Task, TaskCreate, TaskList, AskUserQuestion
model: opus
argument-hint: "[task description]"
---

# /think - Planning Orchestrator

Orchestrate implementation planning with SOW and Spec generation.

## Input

- Task description: `$1` (optional)
- If `$1` is empty → use research context or prompt via AskUserQuestion

## Execution

| Step | Action                  | Output                                     |
| ---- | ----------------------- | ------------------------------------------ |
| 0    | Q&A Clarification       | (if unclear)                               |
| 1    | Design Exploration      | ≥3 approaches with trade-off comparison    |
| 2    | User Selection          | chosen approach (with trade-off rationale) |
| 2.5  | ADR Proposal            | (if needed)                                |
| 3    | /sow                    | sow.md                                     |
| 4    | /spec                   | spec.md                                    |
| 5    | sow-spec-reviewer (≥90) | (optional)                                 |
| 6    | SOW → Todos             | TaskCreate                                 |

## ADR Proposal (Step 2.5)

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

## Todo Generation (Step 6)

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

| Check                       | Required |
| --------------------------- | -------- |
| sow.md generated?           | Yes      |
| spec.md generated?          | Yes      |
| Todos created (TaskCreate)? | Yes      |
