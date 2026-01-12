---
description: Generate Statement of Work (SOW) for planning complex tasks
allowed-tools: Bash(git log:*), Bash(git diff:*), Read, Write, Glob, Grep, LS, Task
model: opus
argument-hint: "[task description]"
dependencies: [formatting-audits, managing-planning]
---

# /sow - SOW Generator

Generate sow.md for planning and analysis.

## Input

- Argument: task description (optional)
- If missing: use research context or prompt via AskUserQuestion

### Resolution Order

1. Argument provided → use as task description
2. Research context exists → use `.claude/workspace/research/*-context.md`
3. None → prompt via AskUserQuestion

## Execution

Generate SOW using template structure from `managing-planning` skill (ID format: I-001, AC-001, R-001).

### Required Sections

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

## Output

```text
.claude/workspace/planning/[timestamp]-[feature]/sow.md
```
