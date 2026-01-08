---
name: reviewing-silent-failures
description: >
  Silent failure detection patterns for frontend code.
  Triggers: サイレント障害, silent failure, 空のcatch, empty catch,
  未処理Promise, unhandled rejection, unhandled promise, Error Boundary,
  fire and forget, エラーハンドリング, error handling, try-catch.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
agent: silent-failure-reviewer
---

# Silent Failure Review - Error Visibility & Handling

Target: All failures are visible, debuggable, and user-informed.

## Silent Failure Risk Levels

| Pattern                     | Risk       | Impact                       |
| --------------------------- | ---------- | ---------------------------- |
| Empty catch block           | [Critical] | Errors completely hidden     |
| Promise without catch       | [Critical] | Unhandled rejections         |
| Fire and forget async       | [High]     | Lost error context           |
| Console.log only            | [High]     | No user feedback             |
| Missing Error Boundary      | [High]     | App crash on component error |
| Excessive optional chaining | [Medium]   | May mask bugs                |

## Section-Based Loading

| Section    | File                               | Focus                           | Triggers               |
| ---------- | ---------------------------------- | ------------------------------- | ---------------------- |
| Detection  | `references/detection-patterns.md` | Regex patterns, search commands | 空のcatch, empty catch |
| Handling   | `references/error-handling.md`     | Proper error handling patterns  | エラーハンドリング     |
| Boundaries | `references/error-boundaries.md`   | React Error Boundary            | Error Boundary         |

## Quick Checklist

### Critical (Must Fix)

- [ ] No empty catch blocks
- [ ] All Promises have error handling (`.catch` or `try-catch`)
- [ ] No `console.log` as only error handling
- [ ] No swallowed errors in event handlers

### High Priority

- [ ] Error boundaries around major sections
- [ ] Async operations in useEffect have error handling
- [ ] API calls have proper error states
- [ ] Form submissions handle failures

### Best Practices

- [ ] Errors logged with context (user id, action, etc.)
- [ ] User-facing error messages for failures
- [ ] Optional chaining used intentionally, not defensively
- [ ] Retry logic for transient failures

## Key Principles

| Principle            | Application                         |
| -------------------- | ----------------------------------- |
| Fail Fast            | Make failures visible and immediate |
| User Feedback        | Always inform users of failures     |
| Context Logging      | Log with enough info to debug       |
| Graceful Degradation | Fail gracefully, not silently       |

## Detection Commands

```bash
# Empty catch blocks
rg "catch\s*\([^)]*\)\s*\{\s*\}" --glob "*.{ts,tsx}"

# Then without catch
rg "\.then\([^)]+\)$" --glob "*.{ts,tsx}"

# Console.log only error handling
rg "catch.*console\.log" --glob "*.{ts,tsx}"
```

## Common Patterns

### Empty Catch → Proper Handling

```typescript
// Bad: Silent failure
try {
  await fetchUserData();
} catch (e) {
  // Nothing here - error disappears
}

// Good: Proper handling
try {
  await fetchUserData();
} catch (error) {
  logger.error("Failed to fetch user data", { error });
  setError("Unable to load user data. Please try again.");
}
```

### Promise Chain → Error Handling

```typescript
// Bad: Unhandled rejection
fetchData().then((data) => setData(data));

// Good: With error handling
fetchData()
  .then((data) => setData(data))
  .catch((error) => {
    logger.error("Failed to fetch data", error);
    setError("Loading failed");
  });
```

## References

### Core Principles

- [@../../rules/development/PROGRESSIVE_ENHANCEMENT.md](../../rules/development/PROGRESSIVE_ENHANCEMENT.md) - Graceful degradation

### Related Skills

- `reviewing-type-safety` - Type safety catches some errors at compile time
- `generating-tdd-tests` - Test error paths

### Used by Agents

- `silent-failure-reviewer` - Primary consumer of this skill
