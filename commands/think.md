---
description: Orchestrate SOW and Spec generation for comprehensive planning
allowed-tools: SlashCommand, Read, Write, Glob, Task, TaskCreate, TaskList
model: opus
argument-hint: "[task description]"
---

# /think - Planning Orchestrator

Orchestrate implementation planning with SOW and Spec generation.

## Input

- Argument: task description (optional)
- If missing: use research context or prompt via AskUserQuestion

## Execution

| Step | Action                  | Output          |
| ---- | ----------------------- | --------------- |
| 0    | Q&A Clarification       | (if unclear)    |
| 1    | Design Exploration      | 4 approaches    |
| 2    | User Selection          | chosen approach |
| 3    | /sow                    | sow.md          |
| 4    | /spec                   | spec.md         |
| 5    | sow-spec-reviewer (≥90) | (optional)      |
| 6    | SOW → Todos             | TaskCreate      |

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
