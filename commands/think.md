---
description: Orchestrate SOW and Spec generation for comprehensive planning
allowed-tools: SlashCommand, Read, Write, Glob, Task
model: opus
argument-hint: "[task description] (optional if research context exists)"
dependencies: [sow-spec-reviewer, managing-planning]
---

# /think - Planning Orchestrator

Orchestrate implementation planning with SOW and Spec generation.

## Workflow Reference

**Full workflow**: [@../skills/managing-planning/references/think-workflow.md](../skills/managing-planning/references/think-workflow.md)

## Input Resolution

```text
/think execution
    ├─ Argument provided? → Use as task description
    ├─ Research context exists? → Use research findings
    └─ None → Ask user for description
```

## Execution Flow

```text
Step 0: Requirements Clarification (Conditional)
    ↓
Step 1: Implementation Design Exploration
    ├─ Plan Agent (Opus) - Recommended approach
    └─ 3x code-architect - Alternative approaches
    ↓
Step 2: Display Analysis & User Selection
    ↓
Step 3: /sow → Generate SOW
    ↓
Step 4: /spec → Generate Spec (+ IDR determination)
    ↓
Step 5: sow-spec-reviewer (optional)
    ↓
Step 6: Generate Summary
```

## Questions (Step 0)

| Category    | Focus                      |
| ----------- | -------------------------- |
| Purpose     | Goal, problem, beneficiary |
| Users       | Primary users              |
| Priority    | MoSCoW                     |
| Success     | "Done" definition          |
| Constraints | Deadline, dependencies     |

## Output

```text
.claude/workspace/planning/[timestamp]-[feature]/
├── sow.md     # Statement of Work
├── spec.md    # Specification
└── summary.md # Review Summary ← Start here
```

## Usage

```bash
/think "Add user authentication"
/research "auth options" && /think  # After research
```

## Related

- `/sow` - SOW only
- `/spec` - Spec only
- `/plans` - View documents
- `/code` - Implement
