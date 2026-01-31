---
description: Orchestrate specialized review agents for thorough, comprehensive code quality assessment
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(ls:*), Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task, AskUserQuestion
model: opus
argument-hint: "[target files or scope]"
---

# /audit - Thorough Code Audit Orchestrator

Orchestrate specialized review agents for thorough audit with confidence-based filtering.

## Input

- Target scope: `$1` (optional)
- If `$1` is empty → select focus via AskUserQuestion, then review staged/modified files

### Audit Focus

| Question | Options                                    |
| -------- | ------------------------------------------ |
| Focus    | security / performance / readability / all |

## Execution

| Step | Action                                                                                  |
| ---- | --------------------------------------------------------------------------------------- |
| 1    | `Task` with `subagent_type: audit-orchestrator`                                         |
| 2    | Orchestrator runs agents (see audit-orchestrator.md)                                    |
| 3    | Integrator aggregates findings (Strong Inference: ≥3 root cause hypotheses → eliminate) |
| 4    | Save snapshot (see Snapshot Naming below)                                               |
| 5    | Compare with previous snapshot, display delta                                           |
| 6    | Output report using template                                                            |

## Snapshot Naming

```bash
SNAPSHOT="$HOME/.claude/workspace/history/audit-$(date -u +%Y-%m-%d-%H%M%S).yaml"
```

Example output: `audit-2026-01-23-031812.yaml`

## Templates

| Template                                                              | Purpose                  |
| --------------------------------------------------------------------- | ------------------------ |
| [@../templates/audit/output.md](../templates/audit/output.md)         | Output format with delta |
| [@../templates/audit/snapshot.yaml](../templates/audit/snapshot.yaml) | Snapshot schema          |

## Verification

| Check                                                   | Required |
| ------------------------------------------------------- | -------- |
| `Task` called with `subagent_type: audit-orchestrator`? | Yes      |
| Snapshot saved?                                         | Yes      |
| Delta comparison displayed?                             | Yes      |
