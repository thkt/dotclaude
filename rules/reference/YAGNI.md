---
paths: "**/*.{ts,tsx,js,jsx,md}"
summary: |
  You Aren't Gonna Need It - Don't build for imagined future needs.
  Add complexity only when measured problems occur, not anticipated scenarios.
  Ship the outcome, not the architecture.
decision_question: "Is this solving a real problem that exists now?"
---

# YAGNI - You Aren't Gonna Need It

**Core Principle**: Don't add functionality until it's actually needed

## Philosophy

"You Aren't Gonna Need It" - One of Extreme Programming's core practices

The principle is simple but powerful:

- **Don't implement** features you think you'll need later
- **Don't build** abstractions for imagined future use cases
- **Don't optimize** for problems you haven't measured
- **Don't add** flexibility "just in case"

## Why YAGNI Matters

### The Cost of Premature Features

Every line of code you write has costs:

- **Maintenance burden**: Code must be tested, documented, updated
- **Cognitive load**: More code = more complexity to understand
- **Opportunity cost**: Time spent on YAGNI features is time not spent on real needs
- **Wrong assumptions**: Future predictions are usually wrong

### The Insight

> "The best code is code that doesn't exist yet doesn't need to"

Software development is about:

- Solving **today's problems** with today's knowledge
- Adapting **tomorrow's problems** with tomorrow's knowledge

## Outcome-First Development

**Ship the outcome, not the architecture**

### Implementation Phases

Follow this progression, adding each phase only when needed:

1. **Make it Work** - Solve the immediate problem
   - Focus: Functionality
   - Quality bar: Passes basic tests
   - Timeline: Hours to days

2. **Make it Resilient** - Add error handling when errors occur
   - Focus: Reliability
   - Quality bar: Handles edge cases
   - Timeline: After production usage reveals failure modes

3. **Make it Fast** - Optimize when slowness is measured
   - Focus: Performance
   - Quality bar: Meets performance requirements
   - Timeline: After profiling shows bottlenecks

4. **Make it Flexible** - Add options when users request them
   - Focus: Extensibility
   - Quality bar: Supports actual use cases
   - Timeline: After multiple similar requests

**Critical**: Don't do phases 2-4 until evidence demands them.

## Decision Framework

Before adding any code, ask these questions:

### The Four Questions

1. **Is this solving a real problem that exists now?**
   - If no: Skip it
   - If yes: Continue

2. **Has this actually failed in production?**
   - If no: Don't add error handling yet
   - If yes: Add targeted fix

3. **Have users complained about this?**
   - If no: Don't add the feature
   - If yes: Understand the real need first

4. **Is there measured evidence of the issue?**
   - If no: Don't optimize
   - If yes: Profile, then fix the bottleneck

**Rule**: If you answer "No" to question 1, stop. Don't proceed.

## Examples

```typescript
// ❌ YAGNI violation: Over-engineered for imagined futures
interface DatabaseAdapter { query(): Promise<Result> }
class PostgresAdapter implements DatabaseAdapter { }  // Only implementation
// 10x more code, untested paths, maintenance burden

// ✅ YAGNI compliant: Solve actual need
async function getUser(id: string): Promise<User> {
  return db.query('SELECT * FROM users WHERE id = $1', [id])
}
// Add interface when 2nd database appears
```

## Common YAGNI Violations

| Violation | Problem | YAGNI Solution |
|-----------|---------|----------------|
| **Premature Abstraction** | Interface with single implementation | Direct function until 2nd implementation needed |
| **Premature Optimization** | Complex caching before measuring | Simple query, optimize after profiling |
| **Premature Configuration** | 50+ config options unused | Hardcode values, add config when variation needed |
| **Generic Components** | DataGrid with 30+ unused props | Specific component (UserTable), generalize at 3rd use |

## When to Add Complexity

YAGNI doesn't mean "never plan ahead." Add complexity when:

### Valid Reasons to Build Ahead

1. **Known future requirement** with confirmed timeline
   - Example: Contract specifies multi-tenancy in Phase 2
   - Caveat: Confirm it's really needed before building

2. **Refactoring cost** would be prohibitive later
   - Example: Database schema migration affecting 1M records
   - Caveat: Are you sure? Measure the cost

3. **Compliance requirement** that must be built upfront
   - Example: GDPR data retention requirements
   - Caveat: Build minimum viable compliance

### The Test

Ask yourself:

- "What evidence do I have that this will be needed?"
- "What is the cost of adding it later vs now?"
- "Am I speculating or responding to real requirements?"

If you're speculating, YAGNI says: Don't build it.

## The YAGNI Mindset

### Core Principles

- Start with the **happy path**
- Add complexity only in **response to reality**
- Every line of code is a **liability**
- YAGNI is the **default position**

### Development Flow

```markdown
Requirement → Simplest solution → Ship → Learn → Iterate

NOT:

Requirement → Anticipate all futures → Build flexible system → Ship → Never use flexibility
```

### Team Practice

Normalize these phrases:

- "Let's solve the problem we have, not the one we imagine"
- "We can add that when we need it"
- "What evidence do we have that this is necessary?"
- "Ship it simple, iterate based on feedback"

## Integration with Other Principles

### YAGNI + Occam's Razor

**Occam's Razor**: Choose the simplest solution
**YAGNI**: Don't build what you don't need

Together: Choose the simplest solution that solves **today's problem only**

### YAGNI + Progressive Enhancement

**Progressive Enhancement**: Start minimal, enhance gradually
**YAGNI**: Don't build for imagined futures

Together: Build minimum viable feature, enhance based on **actual usage**

### YAGNI + TDD

**TDD**: Write test, write minimum code to pass
**YAGNI**: Don't implement untested features

Together: Test-driven development **naturally enforces YAGNI**

## Red Flags

You're violating YAGNI when you hear:

- "We might need this later"
- "Let's make it flexible just in case"
- "This will save time in the future"
- "We should prepare for scale"
- "What if we need to support X?"

**Counter with**:

- "What evidence says we'll need it?"
- "Can we add it when the need arises?"
- "What's the cost of adding it later?"
- "Do we have that problem now?"
- "Let's solve it when X happens"

## Remember

> "The best way to predict the future is to wait for it" - Pragmatic Programmers

**Key Takeaways**:

- Build for **now**, not for imagined futures
- Add complexity in **response to evidence**, not speculation
- Every feature has a **cost** (maintenance, complexity, opportunity)
- **Simplicity** is a feature, not a limitation
- You can **always add more** (but rarely remove)

## Related Principles

See: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md#reference-principles)
