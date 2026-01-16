---
description: Orchestrate specialized review agents for comprehensive code quality assessment
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[target files or scope]"
---

# /audit - Code Review Orchestrator

Orchestrate specialized review agents with confidence-based filtering.

## Input

- Argument: target scope (optional)
- If missing: review staged/modified files (via `git diff --name-only`)

## Agent

| Type  | Name               | Purpose                           |
| ----- | ------------------ | --------------------------------- |
| Agent | audit-orchestrator | 15 reviewers orchestration (fork) |

## Execution

| Step | Action                                                    |
| ---- | --------------------------------------------------------- |
| 1    | `Task` with `subagent_type: audit-orchestrator`           |
| 2    | Orchestrator runs 15 agents (Core 8 + toolkit 4 + Prod 3) |
| 3    | Integrator aggregates findings into structured output     |

## Flow

```text
[reviewers] → [orchestrator] → [integrator YAML] → [command formats]
```

## Output

```markdown
# Review Summary

- Findings: {summary.total_findings} | Critical {summary.by_severity.critical} / High {summary.by_severity.high} / Medium {summary.by_severity.medium}

## Critical Issues

{priorities[priority=critical].item} - {priorities[priority=critical].action}

## Patterns Detected

{patterns[].name}: {patterns[].root_cause}

## Recommended Actions

1. [✓] Immediate: {priorities[timing=immediate].action}
2. [→] This Sprint: {priorities[timing=this_sprint].action}
```

## IDR

- If IDR exists: append `/audit` section with review summary, issues, recommendations
- If no IDR: skip (terminal output only)

## Verification

| Check                                                   | Required |
| ------------------------------------------------------- | -------- |
| `Task` called with `subagent_type: audit-orchestrator`? | Yes      |
