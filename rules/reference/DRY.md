---
paths: "**/*.{ts,tsx,js,jsx,md}"
summary: |
  Single authoritative representation for every piece of knowledge.
  It's about knowledge duplication, not just code duplication.
  Rule of Three: See it 3 times → refactor.
decision_question: "Am I duplicating knowledge or intent?"
---

# DRY Principle like Andy Hunt & Dave Thomas

Apply the Don't Repeat Yourself principle like the Pragmatic Programmers - eliminate duplication of knowledge, not just code.

## Core Philosophy

**"Every piece of knowledge must have a single, unambiguous, authoritative representation within a system"**

It's not just about code duplication - it's about knowledge duplication.

## Types of Duplication

### 1. Literal Code Duplication

```javascript
// ❌ Bad: Copy-paste
function validateEmail(email) { /* validation */ }
function checkEmail(email) { /* same validation */ }

// ✅ Good: Single source
function validateEmail(email) { /* validation */ }
```

### 2. Structural Duplication

```javascript
// ❌ Bad: Repeated structure
if (user.age > 18 && user.hasConsent) { allow() }
if (post.age > 18 && post.hasConsent) { allow() }

// ✅ Good: Extract pattern
function canAccess(entity) {
  return entity.age > 18 && entity.hasConsent
}
```

### 3. Knowledge Duplication

```javascript
// ❌ Bad: Business rule in multiple places
// In validation: maxLength = 100
// In database: VARCHAR(100)
// In UI: maxlength="100"

// ✅ Good: Single source of truth
const LIMITS = { username: 100 }
// Use LIMITS everywhere
```

## When to Apply DRY

**Apply to**:

- Business rules/logic
- Data schemas
- Configuration values
- Algorithms
- Complex conditions

**Don't over-apply to**:

- Coincidental similarity
- Different contexts
- Test data
- Simple one-liners

## Rule of Three

See duplication twice? Note it.
See it three times? Refactor it.

## Common Violations and Fixes

```javascript
// ❌ Magic numbers
if (items.length > 10)

// ✅ Named constants
if (items.length > MAX_ITEMS)
```

```javascript
// ❌ Repeated conditions
if (user && user.isActive && user.hasPermission)

// ✅ Encapsulated logic
if (user.canPerform(action))
```

## DRY Techniques

1. **Extract functions**: For repeated logic
2. **Configuration objects**: For repeated values
3. **Inheritance/Composition**: For repeated structure
4. **Code generation**: For repetitive patterns
5. **Templates**: For similar implementations

## Integration with Other Principles

- **With SOLID**: DRY drives good abstractions (DIP)
- **With TDD**: Tests reveal duplication early
- **With Tidyings**: Remove duplication incrementally

## Warning Signs

- Shotgun surgery (changes in many places)
- Changes that diverge over time
- "Didn't I just write this?"
- Need for global search-replace

## Remember

"DRY is about the duplication of knowledge, of intent. It's about expressing the same thing in two or more places, possibly in two or more totally different ways." - The Pragmatic Programmer

## Related Principles

### Core Principles (Same Level)

- [@~/.claude/rules/reference/SOLID.md](~/.claude/rules/reference/SOLID.md) - DRY drives good abstractions (DIP)
- [@~/.claude/rules/reference/OCCAMS_RAZOR.md](~/.claude/rules/reference/OCCAMS_RAZOR.md) - Simplicity through single sources

### Applied in Practice

- [@~/.claude/rules/development/TDD_RGRC.md](~/.claude/rules/development/TDD_RGRC.md) - Tests reveal duplication early
- [@~/.claude/rules/development/TIDYINGS.md](~/.claude/rules/development/TIDYINGS.md) - Remove duplication incrementally
