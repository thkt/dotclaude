---
description: Generate Statement of Work (SOW) for planning complex tasks
allowed-tools: Bash(git log:*), Bash(git diff:*), Read, Write, Glob, Grep, LS, Task
model: inherit
argument-hint: "[task description] (optional if research context exists)"
dependencies: [formatting-audits, managing-planning]
---

# /sow - SOW Generator

Generate sow.md for planning and analysis.

## Workflow Reference

**Full workflow**: [@../skills/managing-planning/references/sow-generation.md](../skills/managing-planning/references/sow-generation.md)

## Input Resolution

```text
/sow execution
    ├─ Argument provided? → Use as task description
    └─ No argument
          ├─ Research context exists? → Use research findings
          └─ None → Ask user for description
```

## Research Context

```bash
!`ls -t .claude/workspace/research/*-context.md 2>/dev/null | head -1 || echo "(no research)"`
```

## Template

**Structure**: [@../templates/sow/workflow-improvement.md](../templates/sow/workflow-improvement.md)

- Copy: Section structure, ID naming (I-001, AC-001, R-001)
- Do NOT copy: Actual content

## Required Sections

1. Executive Summary
2. Problem Analysis
3. Assumptions & Prerequisites
4. Solution Design
5. Test Plan
6. Acceptance Criteria
7. Implementation Plan (with Progress Matrix)
8. Success Metrics
9. Risks & Mitigations
10. Verification Checklist

## Confidence Markers

| Range        | Meaning              |
| ------------ | -------------------- |
| [C: 0.9+]    | Verified (file:line) |
| [C: 0.7-0.9] | Inferred             |
| [C: <0.7]    | Uncertain            |

## Output

```text
Save to: .claude/workspace/planning/[timestamp]-[feature]/sow.md
```

## Next Steps

- `/spec` - Generate implementation specification
- `/plans` - View created documents
