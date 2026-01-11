---
description: Remove AI-generated slop and simplify code for clarity and maintainability
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), Read, Edit, MultiEdit, Grep, Glob
model: opus
dependencies: [orchestrating-workflows]
---

# /polish - Code Simplification & AI Slop Removal

Remove AI-generated slop and simplify code before commit.

## What to Remove

### 1. Unnecessary Comments

```typescript
// Bad: AI adds obvious comments
// Get the user name
const name = user.name;

// Good: Self-explanatory
const name = user.name;
```

### 2. Excessive Defensive Code

```typescript
// Bad: Over-defensive
if (!user) throw new Error("...");
if (!user.name) throw new Error("...");

// Good: Trust internal callers
return { ...user, processed: true };
```

### 3. Over-Engineering

**Reference**: [@../skills/reviewing-readability/references/ai-antipatterns.md](../skills/reviewing-readability/references/ai-antipatterns.md)

- Single-implementation interfaces → Remove
- Classes wrapping one function → Convert to function
- Helper functions used once → Inline

### 4. Code Complexity

- Nested ternary → Switch/if-else
- Deep nesting → Early returns

## Process

```text
1. Get diff: git diff main...HEAD
2. Analyze for AI patterns
3. Apply fixes
4. Report summary
```

## Principles

- **Occam's Razor**: Simplest solution
- **TIDYINGS**: Clean only changed code
- **Consistency**: Match existing style

## Output

```text
Polished: Removed 5 comments, inlined 2 helpers
```

## IDR Update

Append `/polish` section to IDR with removals and simplifications.

## Next Steps

- **Ready** → `/commit`
- **More cleanup** → `/audit`
