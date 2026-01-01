---
description: Remove AI-generated slop from code changes in the current branch
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), Read, Edit, MultiEdit, Grep, Glob
model: inherit
---

# /polish - Remove AI Code Slop

## Purpose

Clean up AI-generated code by removing unnecessary additions that don't match the project's existing style. Run this before committing to ensure clean, human-like code.

## When to Use

```text
/audit → Find issues
   ↓
/polish → Remove AI slop ← Here
   ↓
/commit → Clean state
```

## What to Remove

### 1. Unnecessary Comments

```typescript
// Bad: AI adds obvious comments
// Get the user name from the user object
const name = user.name

// Good: Self-explanatory code needs no comment
const name = user.name
```

- Comments explaining what code does (not why)
- Comments inconsistent with the rest of the file
- Redundant JSDoc for simple functions

### 2. Excessive Defensive Code

```typescript
// Bad: Over-defensive in trusted context
function processUser(user: User) {
  if (!user) throw new Error('User is required')
  if (!user.name) throw new Error('Name is required')
  if (typeof user.name !== 'string') throw new Error('Name must be string')
  // ... when caller already validates
}

// Good: Trust internal callers
function processUser(user: User) {
  return { ...user, processed: true }
}
```

- Unnecessary null checks on validated data
- Try-catch blocks around code that doesn't throw
- Type guards on already-typed parameters

### 3. Over-Engineering Patterns

Refer to: [@~/.claude/skills/reviewing-readability/references/ai-antipatterns.md](~/.claude/skills/reviewing-readability/references/ai-antipatterns.md)

- Interfaces with single implementation → Remove interface
- Classes wrapping one function → Convert to function
- Factory patterns for simple creation → Direct function
- Helper functions used once → Inline them

### 4. Style Inconsistencies

- Formatting that differs from rest of file
- Naming conventions that don't match project
- Import ordering inconsistent with file

## Process

1. **Get branch diff**

   ```bash
   git diff main...HEAD
   ```

2. **Analyze changes for AI patterns**
   - Scan for patterns above
   - Compare with surrounding code style
   - Identify inconsistencies

3. **Apply fixes**
   - Remove unnecessary additions
   - Simplify over-engineered code
   - Align with file's existing style

4. **Report summary**

   ```markdown
   ## Polish Summary

   Removed:
   - 3 unnecessary comments
   - 1 redundant try-catch
   - 2 single-use helpers inlined

   Files: src/api.ts, src/utils.ts
   ```

## Principles Applied

- **Occam's Razor**: Simplest solution wins
- **TIDYINGS**: Clean only changed code
- **Consistency**: Match existing file style

## What NOT to Do

- Don't refactor code that wasn't changed in this branch
- Don't add new features or improvements
- Don't change working logic
- Don't touch files outside the diff

## Output Format

Keep summary brief (1-3 sentences):

```text
✨ Polished: Removed 5 unnecessary comments and inlined 2 single-use helpers in src/api.ts
```
