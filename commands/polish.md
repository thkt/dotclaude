---
description: Remove AI-generated slop and simplify code for clarity and maintainability
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), Read, Edit, MultiEdit, Grep, Glob
model: opus
---

# /polish - Code Simplification & AI Slop Removal

## Purpose

Clean up and simplify code by:

1. Removing AI-generated slop (unnecessary additions)
2. Simplifying code structure for clarity (code-simplifier integrated)
3. Ensuring consistency with project standards

Run this before committing to ensure clean, maintainable code.

## When to Use

```text
/audit → Find issues
   ↓
/polish → Simplify & remove slop ← Here
   ↓
/commit → Clean state
```

## What to Remove

### 1. Unnecessary Comments

```typescript
// Bad: AI adds obvious comments
// Get the user name from the user object
const name = user.name;

// Good: Self-explanatory code needs no comment
const name = user.name;
```

- Comments explaining what code does (not why)
- Comments inconsistent with the rest of the file
- Redundant JSDoc for simple functions

### 2. Excessive Defensive Code

```typescript
// Bad: Over-defensive in trusted context
function processUser(user: User) {
  if (!user) throw new Error("User is required");
  if (!user.name) throw new Error("Name is required");
  if (typeof user.name !== "string") throw new Error("Name must be string");
  // ... when caller already validates
}

// Good: Trust internal callers
function processUser(user: User) {
  return { ...user, processed: true };
}
```

- Unnecessary null checks on validated data
- Try-catch blocks around code that doesn't throw
- Type guards on already-typed parameters

### 3. Over-Engineering Patterns

Refer to: [@../skills/reviewing-readability/references/ai-antipatterns.md](~/.claude/skills/reviewing-readability/references/ai-antipatterns.md)

- Interfaces with single implementation → Remove interface
- Classes wrapping one function → Convert to function
- Factory patterns for simple creation → Direct function
- Helper functions used once → Inline them

### 4. Style Inconsistencies

- Formatting that differs from rest of file
- Naming conventions that don't match project
- Import ordering inconsistent with file

### 5. Code Complexity (from code-simplifier)

```typescript
// Bad: Nested ternary
const status = isActive ? (isPremium ? "vip" : "active") : "inactive";

// Good: Explicit switch/if-else
function getStatus(isActive: boolean, isPremium: boolean): string {
  if (!isActive) return "inactive";
  return isPremium ? "vip" : "active";
}
```

- Nested ternary operators → Switch/if-else chains
- Deep nesting → Early returns
- Overly compact one-liners → Readable explicit code
- Redundant abstractions → Direct implementation

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

## Simplification Guidelines (from code-simplifier)

When simplifying, prioritize:

1. **Preserve Functionality**: Never change what code does, only how
2. **Clarity over Brevity**: Explicit code > overly compact code
3. **Project Standards**: Follow CLAUDE.md conventions
4. **Balance**: Avoid over-simplification that hurts maintainability

## Principles Applied

- **Occam's Razor**: Simplest solution wins
- **TIDYINGS**: Clean only changed code
- **Consistency**: Match existing file style
- **Readability**: Understandable in <1 minute

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

## IDR Update

After polish is complete, update the IDR (Implementation Decision Record) with simplification results.

### IDR Requirement Check

Before updating IDR, check if it's required:

1. **Check spec.md** for `idr_required` field (Section 11)
2. **If `idr_required: false`** → Skip IDR update
3. **If `idr_required: true` or no spec** → Update IDR

### IDR Detection

For detailed logic: [@../references/commands/shared/idr-generation.md](~/.claude/references/commands/shared/idr-generation.md)

Search for existing IDR:

1. `~/.claude/workspace/planning/**/idr.md` (SOW-related)
2. `~/.claude/workspace/idr/**/idr.md` (standalone)

### IDR Section Addition

Append `/polish` section to IDR:

```markdown
## /polish - [YYYY-MM-DD HH:MM]

### Removals

| Item           | Type                | Reason   |
| -------------- | ------------------- | -------- |
| [removed item] | Comment/Code/Helper | [reason] |

### Simplifications

- [simplified content and rationale]
```

## Next Steps

After polish:

- **Ready to commit** → `/commit`
- **Need validation** → `/validate`
- **More cleanup needed** → Run `/audit` again
