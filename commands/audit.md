---
description: Orchestrate specialized review agents for comprehensive code quality assessment
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(ls:*), Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task
model: opus
argument-hint: "[target files or scope]"
---

# /audit - Code Review Orchestrator

Orchestrate specialized review agents with confidence-based filtering.

## Input

- Argument: target scope (optional)
- If missing: review staged/modified files (via `git diff --name-only`)

## Execution

| Step | Action                                                |
| ---- | ----------------------------------------------------- |
| 1    | `Task` with `subagent_type: audit-orchestrator`       |
| 2    | Orchestrator runs 17 agents (13 local + 4 external)   |
| 3    | Integrator aggregates findings into structured output |
| 4    | Save snapshot to `~/.claude/workspace/history/`       |
| 5    | Compare with previous snapshot, display delta         |
| 6    | Output report using template                          |

## Templates

| Template                            | Purpose                  |
| ----------------------------------- | ------------------------ |
| [@../templates/audit/output.md]     | Output format with delta |
| [@../templates/audit/snapshot.yaml] | Snapshot schema          |

## IDR

- If IDR exists: append `/audit` section
- If no IDR: terminal output only

## Verification

| Check                                                   | Required |
| ------------------------------------------------------- | -------- |
| `Task` called with `subagent_type: audit-orchestrator`? | Yes      |
| Snapshot saved?                                         | Yes      |
| Delta comparison displayed?                             | Yes      |
