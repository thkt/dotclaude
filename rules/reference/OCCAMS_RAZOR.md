---
tier: 1
usage_frequency: every_task
applies_to: ["all"]
related_commands: ["all"]
load_strategy: embedded
token_cost: 1041
summary: |
  Choose the simplest solution that solves the problem.
  Complexity requires justification. When multiple solutions exist,
  prefer the one with fewer moving parts and clearer intent.
decision_question: "Is there a simpler way to achieve this?"
---

# Occam's Razor - The Simplicity Principle

## Core Philosophy

**"Entities should not be multiplied without necessity"** - William of Ockham

The simplest solution that solves the problem is usually the best solution.

## Alternative Names and Expressions

### KISS - Keep It Simple, Stupid

The principle is often expressed as **KISS** in software development circles. This memorable acronym serves as a practical reminder:

- **Keep It Simple** - The goal
- **Stupid** - A humorous reminder that clever solutions often backfire

Both Occam's Razor and KISS express the same fundamental truth: **simplicity is a virtue in design**.

#### Why "Stupid"?

The word "stupid" isn't an insult - it's a reminder:

- **Stupid simple** = So simple that it seems obvious
- Clever code often becomes a maintenance nightmare
- What seems brilliant today confuses everyone tomorrow (including you)

#### KISS in Practice

```typescript
// ❌ "Clever" - using advanced techniques unnecessarily
const isEven = n => !(n & 1);  // Bitwise operation

// ✅ KISS - obviously correct
const isEven = n => n % 2 === 0;  // Clear intent
```

### Other Expressions

- **Principle of Parsimony** - Academic term
- **Law of Parsimony** - Scientific context
- **Lex Parsimoniae** - Latin form
- **最小十分原則** - Japanese expression

All express the same idea: prefer simple explanations and solutions.

## The Principle in Software Development

### What It Means

When faced with multiple solutions to a problem:

1. **Choose the simplest one** that meets all requirements
2. **Avoid unnecessary complexity** until proven needed
3. **Question every abstraction** - is it truly necessary?

### Why It Matters

- **Maintainability**: Simple code is easier to understand and modify
- **Debugging**: Fewer moving parts means fewer places for bugs
- **Onboarding**: New developers understand simple solutions faster
- **Performance**: Less complexity often means better performance

## Practical Application

### Examples in Code

```typescript
// ❌ Unnecessarily complex
class UserAuthenticationManager {
  private strategies: Map<string, AuthStrategy>;
  private validators: ValidatorChain[];
  private observers: AuthObserver[];

  authenticate(credentials: Credentials): AuthResult {
    // ... 50 lines of abstraction
  }
}

// ✅ Simple and sufficient
function authenticate(username: string, password: string): boolean {
  const user = findUser(username);
  return user && verifyPassword(password, user.passwordHash);
}
```

### Examples in Architecture

```markdown
❌ Over-engineered:
- Abstract factory for single implementation
- Event bus for 2 components
- Microservices for 10 users/day

✅ Simple:
- Direct function calls
- Monolith until scale demands otherwise
- Database until caching is measurably needed
```

### Task Scope Based Approach

Choose implementation approach based on actual task scope, not imagined future:

```typescript
// Single-function task → Direct procedural
async function uploadFile(file: File): Promise<string> {
  const data = await file.arrayBuffer()
  return await storage.put(data)
}

// File-level logic → Functions with minimal abstraction
function validateUser(user: User): ValidationError[] { }
function saveUser(user: User): Promise<void> { }
function notifyUser(user: User): void { }

// Module-level complexity → Consider classes/interfaces
class UserRepository {
  // Multiple related operations
  // Shared state (connection, cache)
  // Clear responsibility boundary
}

// System-level architecture → Apply SOLID principles
// Only when: multiple teams, plugin system, public API
```

**Decision rule:**

1. Start with the simplest approach for current scope
2. Refactor to next level only when:
   - Current approach becomes difficult to maintain
   - Multiple similar implementations emerge
   - Complexity is **measured**, not imagined

**Remember:** Procedural vs OOP is not about preference—it's about matching solution complexity to problem complexity.

## Connection to Other Principles

### Baby Steps (TDD_RGRC)

- Each step is the **simplest possible change**
- Complexity emerges only when tests demand it

### Progressive Enhancement

- Start simple, enhance when needed
- "Simple > Complex" is Occam's Razor in action

### YAGNI (You Aren't Gonna Need It)

- Don't add complexity for imagined future needs
- Occam's Razor applied to feature development

## Decision Framework

When evaluating solutions:

```markdown
1. **List all viable solutions**
   - Solution A: 10 lines, 1 dependency
   - Solution B: 100 lines, 3 abstractions

2. **Choose the simplest**
   - Meets all current requirements?
   - Easiest to understand?
   → This is your answer
```

## Warning Signs

### Code Smells

- **"Just in case" abstractions** - Interfaces with single implementation
- **Premature optimization** - Caching before measuring
- **Pattern overuse** - Factory for creating simple objects
- **Deep inheritance** - 4+ levels for simple domain

### Architecture Smells

- **Microservices for small apps** - Distributed complexity
- **Multiple databases** - When one would suffice
- **Message queues** - For synchronous operations
- **Kubernetes** - For single-server deployments

## The Complexity Budget

Think of complexity as a limited budget:

```markdown
Project Complexity Budget: 100 points

Spent on:
- Authentication: 20 points ✓ (necessary)
- Database ORM: 15 points ✓ (saves more complexity)
- Event sourcing: 40 points ✗ (not needed yet)

Remaining: 65 points
→ Save for when actually needed
```

## Practical Guidelines

### When to Apply

- **Every architecture decision** - Start with the simplest
- **Every abstraction** - Question its necessity
- **Every pattern** - Does it solve a real problem?
- **Every dependency** - Is it worth the complexity?

### When NOT to Apply

- **Security** - Don't simplify at the cost of safety
- **Data integrity** - Correctness over simplicity
- **Legal requirements** - Compliance is non-negotiable
- **Proven scaling needs** - When metrics show necessity

## Think Like Ockham

Questions to ask yourself:

- "What problem does this complexity solve?"
- "Is that problem real or imagined?"
- "What's the simplest thing that could possibly work?"
- "Can I delete code instead of adding?"
- "Will a junior developer understand this?"

## Remember

> "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away." - Antoine de Saint-Exupéry

The best code is often:

- **Boring** - No clever tricks
- **Obvious** - Intent is clear
- **Short** - Says only what's necessary
- **Direct** - Minimal indirection

## Related Principles

### Core Principles (Same Level)

- [@./SOLID.md](./SOLID.md) - SRP aligns with focused simplicity
- [@./DRY.md](./DRY.md) - Eliminate duplication, keep it simple

### Applied in Practice

- [@../development/PROGRESSIVE_ENHANCEMENT.md](../development/PROGRESSIVE_ENHANCEMENT.md) - Build simple, enhance gradually
- [@../development/TDD_RGRC.md](../development/TDD_RGRC.md) - Baby Steps embody Occam's Razor
- [@../development/READABLE_CODE.md](../development/READABLE_CODE.md) - Simplicity for understanding
- [@../development/LEAKY_ABSTRACTION.md](../development/LEAKY_ABSTRACTION.md) - Accept simple leaky abstractions over complex "perfect" ones
