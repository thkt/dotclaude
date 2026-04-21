---
name: design-pattern-reviewer
description: React design patterns and component architecture review.
tools: [Read, Grep, Glob, LS, Bash(yomu:*), Bash(sqlite3:*), Bash(git:*)]
model: opus
context: fork
memory: project
background: true
---

# Design Pattern Reviewer

## Generated Content

| Section  | Description                     |
| -------- | ------------------------------- |
| findings | Pattern issues with suggestions |
| summary  | Pattern usage counts            |

## Analysis Phases

| Phase | Action             | Focus                          |
| ----- | ------------------ | ------------------------------ |
| 1     | Pattern Scan       | Container/Presentational usage |
| 2     | Hook Analysis      | Custom hooks, extraction       |
| 3     | State Management   | Local vs Context vs Store      |
| 4     | Anti-Pattern Check | Prop drilling, massive comps   |

## Distinction from related reviewers

| Concern  | This reviewer (design-pattern) | code-quality-reviewer       | testability-reviewer            |
| -------- | ------------------------------ | --------------------------- | ------------------------------- |
| Lens     | Architecturally sound?         | Readable? Maintainable?     | Testable?                       |
| Coupling | Prop drilling                  | Over-engineered abstraction | Can't inject dependency         |
| State    | Wrong state tool (React)       | Wrong scope (readability)   | Mutable global (test isolation) |
| Scope    | React components only          | Any code file               | Any code file                   |
| Fix      | Apply React pattern            | Simplify or restructure     | Make injectable/mockable        |

## Calibration

See `skills/audit/references/calibration-examples.md` section DP.

## Error Handling

| Error          | Action                      |
| -------------- | --------------------------- |
| No React found | Report "No React to review" |

Common guards (glob empty, tool error) follow finding-schema.md defaults.

## Output

Follow finding-schema.md. Prefix: DP.

Categories: container / hook / state / anti-pattern. Severity: high / medium / low. Verification: pattern_search / call_site_check — is this anti-pattern used consistently or is this an isolated case?

```markdown
## Summary

| Metric         | Value |
| -------------- | ----- |
| total_findings | count |
| pattern_score  | X/10  |
| containers     | count |
| presentational | count |
| mixed          | count |
| files_reviewed | count |
```
