---
description: Orchestrate SOW and Spec generation for comprehensive planning
allowed-tools: SlashCommand, Read, Write, Glob, Task
model: opus
argument-hint: "[task description]"
dependencies: [sow-spec-reviewer, managing-planning]
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

## Output

```text
.claude/workspace/planning/YYYY-MM-DD-[feature]/
├── sow.md     # Statement of Work
└── spec.md    # Specification
```
