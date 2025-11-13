---
description: >
  Fundamental software development principles including SOLID, DRY, Occam's Razor (KISS),
  Miller's Law, and YAGNI. Use when discussing principles (原則), simplicity (シンプル),
  complexity (複雑), architecture (アーキテクチャ), refactoring (リファクタリング),
  maintainability (保守性), code quality (コード品質), design patterns, best practices,
  or clean code. Provides decision frameworks and practical guidelines for writing
  maintainable, understandable code. Essential for structure-reviewer, root-cause-reviewer,
  and /code command implementations.
allowed-tools: Read, Grep, Glob
---

# Code Principles - Fundamental Software Development Guidelines

## Overview

This skill consolidates core software development principles into a single, coherent knowledge base. Covers:

1. **SOLID Principles** - Manage dependencies, enable change (Uncle Bob)
2. **DRY** - Don't Repeat Yourself, eliminate knowledge duplication (Pragmatic Programmers)
3. **Occam's Razor (KISS)** - Choose simplest solution (William of Ockham)
4. **Miller's Law** - Respect cognitive limits 7±2 (George Miller)
5. **YAGNI** - You Aren't Gonna Need It (Extreme Programming)

## When to Use This Skill

### Automatic Triggers

Keywords that activate this skill:

- SOLID, DRY, Occam's Razor, KISS
- Miller's Law, YAGNI, principle, 原則
- simplicity, シンプル, complexity, 複雑
- design pattern, architecture, アーキテクチャ
- refactor, リファクタリング
- maintainability, 保守性, code quality, コード品質
- best practice, clean code

### Explicit Invocation

For guaranteed activation:

- "Apply code principles"
- "Use fundamental software principles"
- "Check against SOLID/DRY/YAGNI"

### Common Scenarios

- Architectural design decisions
- Code review and quality assessment
- Refactoring planning
- Complexity evaluation
- System design discussions
- Learning best practices

## Quick Decision Questions

Use these questions to apply principles quickly:

### Occam's Razor / KISS

**"Is there a simpler way to achieve this?"**

- Fewest dependencies (prefer 0-2 over 3+)
- Fewer lines of code (prefer <50 per function)
- Lower cyclomatic complexity (prefer <5 branches)

### DRY

**"Am I duplicating knowledge or intent?"**

- Same business logic in multiple places?
- Configuration values repeated?
- Is there a single source of truth?

### SOLID

**"Does this class/module have a single, clear reason to change?"**

- Single Responsibility Principle (SRP)
- Open-Closed Principle (OCP)
- Check dependencies direction

### Miller's Law

**"Can a new team member understand this in <1 minute?"**

- Function parameters ≤ 5?
- Class public methods ≤ 7?
- Conditional branches ≤ 5?

### YAGNI

**"Is this solving a real problem that exists now?"**

- Building for imagined future?
- Adding flexibility "just in case"?
- Optimizing without measurement?

## Core Principles Overview

### 1. SOLID Principles

**Goal**: Create flexible, maintainable systems through proper dependency management.

**The Five Principles**:

#### S - Single Responsibility Principle

A class should have only one reason to change.

```typescript
// ❌ Multiple responsibilities
class User {
  validate(): boolean  // Validation logic
  save(): void        // Persistence logic
  sendEmail(): void   // Notification logic
}

// ✅ Single responsibility
class UserValidator { validate(user: User): ValidationResult }
class UserRepository { save(user: User): Promise<void> }
class UserNotifier { sendEmail(user: User): Promise<void> }
```

#### O - Open-Closed Principle

Open for extension, closed for modification.

```typescript
// ✅ Extend through interfaces
interface PaymentProcessor {
  process(amount: number): Result
}
class StripeProcessor implements PaymentProcessor {}
class PayPalProcessor implements PaymentProcessor {}
```

#### L - Liskov Substitution Principle

Subtypes must be substitutable for their base types.

#### I - Interface Segregation Principle

Many specific interfaces over one general-purpose interface.

#### D - Dependency Inversion Principle

Depend on abstractions, not concretions.

**Full details**: [@./references/solid.md]

### 2. DRY - Don't Repeat Yourself

**Core Philosophy**: Every piece of knowledge must have a single, unambiguous, authoritative representation.

**Not just code duplication** - it's about knowledge duplication:

```typescript
// ❌ Knowledge duplication
// In validation: maxLength = 100
// In database: VARCHAR(100)
// In UI: maxlength="100"

// ✅ Single source of truth
const LIMITS = { username: 100 }
// Use LIMITS everywhere
```

**Rule of Three**: See duplication twice? Note it. See it three times? Refactor it.

**Full details**: [@./references/dry.md]

### 3. Occam's Razor (KISS)

**Core Philosophy**: The simplest solution that solves the problem is usually the best solution.

**KISS**: Keep It Simple, Stupid - same principle, memorable acronym.

**Decision Framework**:

1. List all viable solutions
2. Choose the simplest one that meets requirements
3. Question every abstraction - is it truly necessary?

```typescript
// ❌ Unnecessarily complex
class UserAuthenticationManager {
  private strategies: Map<string, AuthStrategy>
  // 50 lines of abstraction
}

// ✅ Simple and sufficient
function authenticate(username: string, password: string): boolean {
  const user = findUser(username)
  return user && verifyPassword(password, user.passwordHash)
}
```

**Full details**: [@./references/occams-razor.md]

### 4. Miller's Law

**Core Philosophy**: The human mind can hold approximately 7±2 items in short-term memory.

**Scientific Foundation**: This cognitive limit has profound implications:

- Comprehension time increases exponentially beyond 7±2 items
- Error rates multiply with complexity
- Mental fatigue accelerates

**Recommended Limits**:

- Function parameters: ideal 3, max 5
- Class public methods: max 7
- Conditional branches: max 5
- Function length: 5-15 lines

```typescript
// ❌ Cognitive overload - 9 parameters
function createUser(
  firstName, lastName, email,
  phone, address, city,
  state, zip, country
) { }

// ✅ Respecting cognitive limits - 3 grouped parameters
function createUser(
  identity: UserIdentity,
  contact: ContactInfo,
  location: LocationInfo
) { }
```

**Full details**: [@./references/millers-law.md]

### 5. YAGNI - You Aren't Gonna Need It

**Core Philosophy**: Don't add functionality until it's actually needed.

**Implementation Phases** (add each only when needed):

1. **Make it Work** - Solve immediate problem
2. **Make it Resilient** - Add error handling when errors occur
3. **Make it Fast** - Optimize when slowness is measured
4. **Make it Flexible** - Add options when users request them

**Decision Framework**:
Before adding code, ask:

- Is this solving a real problem that exists now?
- Has this actually failed in production?
- Have users complained about this?
- Is there measured evidence of the issue?

If "No" → Don't add it yet

```typescript
// ❌ YAGNI violation - premature abstraction
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

**Full details**: [@./references/yagni.md]

## Principle Interactions

### How Principles Work Together

```markdown
YAGNI + Occam's Razor:
  "Build the simplest thing that solves today's problem only"

DRY + SOLID (SRP):
  "Single source of truth for each responsibility"

Miller's Law + Occam's Razor:
  "Simplicity within cognitive limits"

SOLID (DIP) + DRY:
  "Abstractions prevent knowledge duplication"

YAGNI + TDD:
  "Test-driven development naturally enforces YAGNI"
```

### Principle Priority

When principles conflict:

1. **Safety First** - Never compromise security or data integrity
2. **YAGNI** - Don't build what you don't need (eliminates many conflicts)
3. **Occam's Razor** - Choose simplest solution among remaining options
4. **SOLID** - Apply when managing dependencies in complex systems
5. **DRY** - Eliminate duplication, but not at cost of clarity
6. **Miller's Law** - Always respect cognitive limits

## Detailed Knowledge Base

### Reference Documents

- **[@./references/solid.md]** - Complete SOLID principles guide with Uncle Bob's methodology
- **[@./references/dry.md]** - Don't Repeat Yourself with Pragmatic Programmers' approach
- **[@./references/occams-razor.md]** - Simplicity principle with KISS, task scope guidance
- **[@./references/millers-law.md]** - Cognitive limits (7±2) with scientific foundation
- **[@./references/yagni.md]** - You Aren't Gonna Need It with outcome-first development

## Integration Points

### With Agents

- **structure-reviewer** - Evaluates code organization against SOLID, DRY principles
- **root-cause-reviewer** - Identifies fundamental design issues using these principles
- **readability-reviewer** - Applies Miller's Law for cognitive load assessment
- **design-pattern-reviewer** - Validates pattern usage against Occam's Razor, SOLID

### With Commands

- **/code** - Applies principles during implementation (especially YAGNI, TDD)
- **/review** - Validates adherence to principles
- **/think** - Uses principles for architecture planning

### Integration Method

```yaml
# In agent YAML frontmatter
dependencies: [code-principles]
```

Or explicit reference:

```markdown
[@~/.claude/skills/code-principles/SKILL.md]
```

## Quick Start

### For New Feature Design

1. **YAGNI First** - What problem exists now?
2. **Occam's Razor** - What's the simplest solution?
3. **Miller's Law** - Can team understand in <1 min?
4. **SOLID (SRP)** - Each component, one responsibility
5. **DRY** - Single source of truth for each concept

### For Refactoring

1. **Identify violation** - Which principle is broken?
2. **SOLID** - Is responsibility clear?
3. **DRY** - Is knowledge duplicated?
4. **Occam's Razor** - Can we simplify?
5. **Miller's Law** - Reduce cognitive load

### For Code Review

1. **Miller's Law** - Understandable in <1 min?
2. **YAGNI** - Is this complexity needed now?
3. **DRY** - Any knowledge duplication?
4. **Occam's Razor** - Simpler alternative exists?
5. **SOLID** - Dependencies properly managed?

## Best Practices

### Do's ✅

- **Start simple** - Apply Occam's Razor and YAGNI first
- **Respect cognitive limits** - Follow Miller's Law constraints
- **Eliminate duplication** - Apply DRY to knowledge, not just code
- **Single responsibility** - SOLID principles for complex systems
- **Evidence-based decisions** - YAGNI requires measurement

### Don'ts ❌

- **Don't over-abstract** - YAGNI violation
- **Don't violate 7±2 limit** - Miller's Law violation
- **Don't duplicate knowledge** - DRY violation
- **Don't mix responsibilities** - SOLID (SRP) violation
- **Don't build for imagined futures** - YAGNI violation

## Success Metrics

Principles are working when:

- Code is easily testable (SOLID, Occam's Razor)
- New team members understand quickly (Miller's Law, Occam's Razor)
- Changes don't break unrelated code (SOLID, DRY)
- Refactoring feels safe (all principles)
- Velocity increases over time (YAGNI, Occam's Razor)

## When NOT to Apply

### Skip complex patterns for

- Prototypes and experiments (YAGNI)
- Simple one-off scripts (Occam's Razor)
- Obvious simple solutions (all principles support simplicity)

### Always apply

- Security concerns (Safety First overrides YAGNI)
- Data integrity (Safety First)
- Cognitive limits (Miller's Law)

**Rule**: When in doubt, start simple. Add complexity only when evidence demands it.

## Resources

### references/

Complete documentation for each principle:

- `solid.md` - Five SOLID principles with examples
- `dry.md` - Don't Repeat Yourself methodology
- `occams-razor.md` - Simplicity principle with KISS
- `millers-law.md` - Cognitive limits (7±2) scientific foundation
- `yagni.md` - You Aren't Gonna Need It with decision framework

### scripts/

Currently empty (knowledge-only skill)

### assets/

Currently empty (knowledge-only skill)
