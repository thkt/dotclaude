---
name: silent-failure-reviewer
description: Silent failure detection. Empty catches, unhandled rejections.
tools: [Read, Grep, Glob, LS, Bash(yomu:*), Bash(sqlite3:*), Bash(git:*)]
model: opus
skills: [reviewing-silent-failures]
context: fork
memory: project
background: true
---

# Silent Failure Reviewer

## Generated Content

| Section  | Description                        |
| -------- | ---------------------------------- |
| findings | Silent failure patterns with fixes |
| summary  | Counts by risk level               |

## Analysis Phases

| Phase | Action            | Focus                            |
| ----- | ----------------- | -------------------------------- |
| 1     | Catch Block Scan  | Empty catch, console.log only    |
| 2     | Promise Check     | .then without .catch             |
| 3     | Async Audit       | Fire-and-forget, unhandled       |
| 4     | UI Feedback Check | Missing error states, boundaries |
| 5     | Fallback Analysis | Silent defaults                  |

## Distinction from operational-readiness-reviewer

| This reviewer (silent-failure)       | operational-readiness-reviewer               |
| ------------------------------------ | -------------------------------------------- |
| Error swallowed? (detection)         | Error contained? (architecture)              |
| Empty catch, console.log-only catch  | Missing ErrorBoundary around risky component |
| Silent default return value          | Missing fallback path for degraded service   |
| Code-level: does the error propagate | System-level: does someone notice/respond    |

| Phase                             | Flags                                 | Level        |
| --------------------------------- | ------------------------------------- | ------------ |
| SF Phase 4 (UI Feedback Check)    | Missing user-visible error indication | User-facing  |
| OPS Phase 1 (Error Boundary Scan) | Missing React ErrorBoundary placement | Architecture |

Same component may receive findings from both — complementary, not duplicate.

## Calibration

See `skills/audit/references/calibration-examples.md` section SF.

## Error Handling

| Error         | Action                     |
| ------------- | -------------------------- |
| No code found | Report "No code to review" |

Common guards (glob empty, tool error) follow finding-schema.md defaults.

## Output

Follow finding-schema.md. Prefix: SF.

Categories: SF1-SF5 (catch / promise / async / ui_feedback / fallback). Severity: critical / high / medium / low. Verification: error_propagation / pattern_search — does this error surface to the user or remain silent?

```markdown
## Summary

| Metric            | Value |
| ----------------- | ----- |
| total_findings    | count |
| critical          | count |
| high              | count |
| empty_catch       | count |
| unhandled_promise | count |
| missing_boundary  | count |
| files_reviewed    | count |
```
