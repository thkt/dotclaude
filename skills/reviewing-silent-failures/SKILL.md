---
name: reviewing-silent-failures
description: Silent failure detection patterns for frontend code.
allowed-tools: [Read, Grep, Glob, Task]
agent: silent-failure-reviewer
user-invocable: false
---

# Silent Failure Review

Target: All failures are visible, debuggable, user-informed.

## Risk Levels

| Pattern                  | Risk       | Impact               |
| ------------------------ | ---------- | -------------------- |
| Empty catch block        | [Critical] | Errors hidden        |
| Promise without catch    | [Critical] | Unhandled rejections |
| Fire and forget async    | [High]     | Lost error context   |
| Console.log only         | [High]     | No user feedback     |
| Missing Error Boundary   | [High]     | App crash            |
| Excessive optional chain | [Medium]   | May mask bugs        |

## Section-Based Loading

| Section   | File                               | Focus          |
| --------- | ---------------------------------- | -------------- |
| Detection | `references/detection-patterns.md` | Regex patterns |

## Quick Checklist

### Critical

- [ ] No empty catch blocks
- [ ] All Promises have error handling
- [ ] No console.log as only handling
- [ ] No swallowed errors in handlers

### High Priority

- [ ] Error boundaries around sections
- [ ] Async useEffect has handling
- [ ] API calls have error states
- [ ] Form submissions handle failures

## Key Principles

| Principle            | Application                   |
| -------------------- | ----------------------------- |
| Fail Fast            | Make failures visible         |
| User Feedback        | Always inform users           |
| Context Logging      | Log with debug info           |
| Graceful Degradation | Fail gracefully, not silently |

## Detection Commands

```bash
rg "catch\s*\([^)]*\)\s*\{\s*\}" --glob "*.{ts,tsx}"  # Empty catch
rg "\.then\([^)]+\)$" --glob "*.{ts,tsx}"             # Then without catch
```
