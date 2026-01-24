---
description: Orchestrate specialized review agents for thorough, comprehensive code quality assessment
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(ls:*), Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task
model: opus
argument-hint: "[target files or scope]"
---

# /audit - Thorough Code Audit Orchestrator

Orchestrate specialized review agents for thorough audit with confidence-based filtering.

## Input

- Target scope: `$1` (optional)
- If `$1` is empty → review staged/modified files (via `git diff --name-only`)

## Execution

| Step | Action                                                |
| ---- | ----------------------------------------------------- |
| 1    | `Task` with `subagent_type: audit-orchestrator`       |
| 2    | Orchestrator runs agents (see audit-orchestrator.md)  |
| 3    | Integrator aggregates findings into structured output |
| 4    | Save snapshot (see Snapshot Naming below)             |
| 5    | Compare with previous snapshot, display delta         |
| 6    | Output report using template                          |

## Snapshot Naming

```bash
SNAPSHOT="$HOME/.claude/workspace/history/audit-$(date -u +%Y-%m-%d-%H%M%S).yaml"
```

Example output: `audit-2026-01-23-031812.yaml`

## Templates

| Template                            | Purpose                  |
| ----------------------------------- | ------------------------ |
| [@../templates/audit/output.md]     | Output format with delta |
| [@../templates/audit/snapshot.yaml] | Snapshot schema          |

## Verification

| Check                                                   | Required |
| ------------------------------------------------------- | -------- |
| `Task` called with `subagent_type: audit-orchestrator`? | Yes      |
| Snapshot saved?                                         | Yes      |
| Delta comparison displayed?                             | Yes      |
