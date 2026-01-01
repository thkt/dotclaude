---
paths: "**/*.{ts,tsx,js,jsx,md}"
summary: |
  Code should be understandable in under 1 minute by any team member.
  Respect Miller's Law (7±2 cognitive limit). Clarity beats cleverness.
  Names should be concrete, flow obvious, functions focused.
decision_question: "Would a new team member understand this in < 1 minute?"
---

# The Art of Readable Code like Dustin Boswell & Trevor Foucher

**Default mindset**: Code should be easy to understand

## Core Philosophy

**"Code should be written to minimize the time it would take for someone else to understand it"**

- That "someone else" might be you six months later
- Understanding time > writing time

## Scientific Foundation

Miller's Law (7±2) demonstrates that human cognitive capacity is limited. When code exceeds these limits:

- Comprehension time increases exponentially
- Error rates multiply
- Mental fatigue accelerates

This scientific backing explains WHY readable code matters: our brains literally cannot process too much complexity at once.

→ See [@../../skills/applying-code-principles/SKILL.md](../../skills/applying-code-principles/SKILL.md) for Miller's Law thresholds

## Key Practices

### 1. Making Code Easy to Understand

#### Names That Can't Be Misconstrued

```typescript
// Bad: Ambiguous
results.filter(x => x > LIMIT)  // Greater than or equal to?

// Good: Clear intent
results.filter(x => x >= MIN_ITEMS_TO_DISPLAY)
```

#### Prefer Concrete over Abstract

```typescript
// Bad: Abstract
processData(data)

// Good: Concrete
validateUserRegistration(formData)
```

### 2. Simplifying Loops and Logic

#### Make Control Flow Obvious

```typescript
// Bad: Complex nesting
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // do something
    }
  }
}

// Good: Early returns
if (!user) return
if (!user.isActive) return
if (!user.hasPermission) return
// do something
```

#### Minimize Nesting

- Use guard clauses
- Extract complex conditions to well-named functions
- Prefer early returns

### 3. Reorganizing Your Code

#### Extract Unrelated Subproblems

```typescript
// Good: Each function does one thing
function getActiveUsers(users: User[]) {
  return users.filter(isActiveUser)
}

function isActiveUser(user: User): boolean {
  return user.status === 'active' && user.lastLogin > thirtyDaysAgo()
}
```

#### One Task at a Time

- Functions should do one thing
- If explaining requires "and", split it
- Separate "what" from "how"

### 4. Code Should Be "Obviously Correct"

#### Make Your Code Look Like Your Intent

```typescript
// Bad: Intent unclear
const p = products.filter(p => p.price > 0 && p.stock)

// Good: Intent obvious
const availableProducts = products.filter(product =>
  product.price > 0 &&
  product.stock > 0
)
```

### 5. Key Questions Before Writing

Ask yourself:

1. "What is the easiest way to understand this?"
2. "What would confuse someone reading this?"
3. "Can I make the intent more obvious?"

## Practical Application

### Variable Naming

- **Specific > Generic**: `userEmail` not `data`
- **Searchable**: `MAX_RETRY_COUNT` not `7`
- **Pronounceable**: `customer` not `cstmr`

### Function Design

- **Small & Focused**: 5-10 lines ideal
- **Descriptive Names**: `calculateTotalPrice()` not `calc()`
- **Consistent Level**: Don't mix high and low-level operations

### Comments

- **Why, not What**: Explain decisions, not mechanics
- **Update or Delete**: Outdated comments are worse than none
- **Code First**: If you need to explain what, rewrite the code

## The Final Test

**"Would a new team member understand this in < 1 minute?"**

If not, simplify further.

## AI Code Smells

When reviewing AI-generated code (including your own), watch for these common over-engineering patterns:

**Red flags:**

- Interfaces with single implementation
- Classes wrapping single functions
- "Future-proof" abstractions with no concrete use case
- Helper functions used exactly once
- Design patterns without clear need

**Fix strategy:**

1. Apply Occam's Razor - delete unnecessary abstractions
2. Start with the most direct solution
3. Add complexity only when pattern appears 3+ times

→ **Detailed examples and detection checklist**: [@../../skills/reviewing-readability/references/ai-antipatterns.md](../../skills/reviewing-readability/references/ai-antipatterns.md)

## Remember

- Clarity beats cleverness
- Future you is a different person
- Reading happens more than writing

## Related Principles

See: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md#development-practices)
