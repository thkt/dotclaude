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

## Agent

| Type  | Name               | Purpose                           |
| ----- | ------------------ | --------------------------------- |
| Agent | audit-orchestrator | 17 reviewers orchestration (fork) |

## Execution

| Step | Action                                                |
| ---- | ----------------------------------------------------- |
| 1    | `Task` with `subagent_type: audit-orchestrator`       |
| 2    | Orchestrator runs 17 agents (13 local + 4 external)   |
| 3    | Integrator aggregates findings into structured output |
| 4    | Save snapshot to history (see Snapshot section)       |
| 5    | Compare with previous and display diff                |

## Flow

```text
[reviewers] → [orchestrator] → [integrator] → [snapshot] → [diff] → [output]
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

## Snapshot

Create directory if not exists: `mkdir -p ~/.claude/workspace/history/`

Save summary to `~/.claude/workspace/history/audit-{timestamp}.yaml`:

```yaml
meta:
  command: audit
  timestamp: { ISO 8601 }
  target: "{target scope}"

summary:
  total_findings: { count }
  by_severity:
    critical: { count }
    high: { count }
    medium: { count }
    low: { count }
  patterns_count: { count }
  agents_reporting: { count }
```

**Filename format**: `audit-YYYY-MM-DD-HHmmss.yaml`

## Diff Comparison

After saving snapshot, compare with most recent previous snapshot:

1. Find latest file in `~/.claude/workspace/history/audit-*.yaml`
2. Compare `by_severity` values
3. Display diff table

**Alert threshold**: Warn if Critical or High increases by +1 or more.

```markdown
## 📊 Comparison with Previous ({previous_date})

| Severity | Previous | Current | Delta   |
| -------- | -------- | ------- | ------- |
| Critical | {n}      | {n}     | {diff}  |
| High     | {n}      | {n}     | ⚠️ +{n} |
| Medium   | {n}      | {n}     | {diff}  |
| Low      | {n}      | {n}     | {diff}  |

⚠️ High severity increased. Review recommended.
```

**No previous snapshot**: Skip diff, display "First recording" message.

## Verification

| Check                                                   | Required |
| ------------------------------------------------------- | -------- |
| `Task` called with `subagent_type: audit-orchestrator`? | Yes      |
| Snapshot saved to `~/.claude/workspace/history/`?       | Yes      |
| Diff comparison displayed (if previous exists)?         | Yes      |
