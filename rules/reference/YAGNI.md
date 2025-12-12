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

### ❌ Violating YAGNI

```typescript
// Adding flexibility nobody asked for
class UserService {
  constructor(
    private cache: CacheStrategy,      // Not needed yet
    private logger: LoggerStrategy,    // Not needed yet
    private validator: ValidationStrategy,  // Not needed yet
    private transformer: DataTransformer    // Not needed yet
  ) {}

  // Plugin system for future extensibility
  plugins: Plugin[] = []
  registerPlugin(plugin: Plugin) { }  // Nobody uses this
}

// "Just in case" abstraction
interface DatabaseAdapter {
  query(): Promise<Result>
}

class PostgresAdapter implements DatabaseAdapter { }
class MySQLAdapter implements DatabaseAdapter { }
class MongoAdapter implements DatabaseAdapter { }

// Reality: Only using Postgres
```

**Problems**:

- 10x more code than needed
- Untested code paths
- Maintenance burden for unused features
- Cognitive overhead for readers

### ✅ Following YAGNI

```typescript
// Solve the actual need
class UserService {
  async getUser(id: string): Promise<User> {
    return db.query('SELECT * FROM users WHERE id = $1', [id])
  }
}

// Add abstractions when second database appears
// Add caching when profiling shows database is bottleneck
// Add validation when invalid data causes bugs
```

**Benefits**:

- Simple and direct
- Easy to test
- Easy to understand
- Easy to refactor when needs change

## Common YAGNI Violations

### 1. Premature Abstraction

```typescript
// ❌ YAGNI violation
interface PaymentProcessor {
  process(amount: number): Promise<Result>
}

class StripePaymentProcessor implements PaymentProcessor { }
// No other processors exist or planned

// ✅ YAGNI compliant
async function processPayment(amount: number) {
  return stripe.charge(amount)
}
// Add interface when second processor is actually needed
```

### 2. Premature Optimization

```typescript
// ❌ YAGNI violation
function getUserPosts(userId: string) {
  // Complex caching, pagination, prefetching
  // Nobody complained about speed
}

// ✅ YAGNI compliant
function getUserPosts(userId: string) {
  return db.query('SELECT * FROM posts WHERE user_id = $1', [userId])
}
// Optimize after measuring actual performance issue
```

### 3. Premature Configuration

```typescript
// ❌ YAGNI violation
const config = {
  cache: {
    ttl: env.CACHE_TTL,
    max: env.CACHE_MAX,
    strategy: env.CACHE_STRATEGY,
    compression: env.CACHE_COMPRESSION
  },
  // 50 more config options
}

// ✅ YAGNI compliant
const CACHE_TTL = 3600  // Hardcode until variation is needed
```

### 4. Generic "Reusable" Components

```typescript
// ❌ YAGNI violation
<DataGrid
  columns={columns}
  data={data}
  sorting={sorting}
  filtering={filtering}
  pagination={pagination}
  grouping={grouping}
  // 30 more props for features not used
/>

// ✅ YAGNI compliant
<UserTable users={users} />
// Simple component for actual need
// Generalize when 3rd similar table appears (Rule of Three)
```

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

### Core Principles (Same Level)

- [@~/.claude/rules/reference/OCCAMS_RAZOR.md](~/.claude/rules/reference/OCCAMS_RAZOR.md) - Choose the simplest solution
- [@~/.claude/rules/reference/DRY.md](~/.claude/rules/reference/DRY.md) - Single source of truth

### Applied in Practice

- [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md) - Build minimal, enhance progressively
- [@~/.claude/rules/development/TDD_RGRC.md](~/.claude/rules/development/TDD_RGRC.md) - TDD naturally enforces YAGNI
