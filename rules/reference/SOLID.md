# SOLID Principles like Robert C. Martin

Design and structure code like Uncle Bob - create flexible, maintainable systems through five fundamental principles.

## Core Philosophy

**Manage dependencies**: Control the direction and flow of dependencies
**Enable change**: Code that's easy to modify without breaking
**Professional craftsmanship**: Write code that other developers respect

## The Five Principles

### 1. Single Responsibility Principle (SRP)

A class should have only one reason to change

```typescript
// ✅ Good: Single responsibility
class UserValidator {
  validate(user: User): ValidationResult
}

// ❌ Bad: Multiple responsibilities
class User {
  validate(): boolean
  save(): void
  sendEmail(): void
}
```

Why: Multiple reasons to change = fragile code

### 2. Open-Closed Principle (OCP)

Open for extension, closed for modification

```typescript
// ✅ Good: Extend through interfaces
interface PaymentProcessor {
  process(amount: number): Result
}
class StripeProcessor implements PaymentProcessor {}
class PayPalProcessor implements PaymentProcessor {}

// ❌ Bad: Modify existing code
if (type === 'stripe') { /* stripe logic */ }
else if (type === 'paypal') { /* paypal logic */ }
```

Why: New features shouldn't break existing code

### 3. Liskov Substitution Principle (LSP)

Subtypes must be substitutable for their base types

```typescript
// ✅ Good: Duck can fly like a Bird
class Bird { fly() {} }
class Duck extends Bird { fly() { /* duck flying */ } }

// ❌ Bad: Penguin breaks Bird contract
class Penguin extends Bird {
  fly() { throw new Error("Can't fly") }
}
```

Why: Inheritance surprises = bugs

### 4. Interface Segregation Principle (ISP)

Many specific interfaces over one general-purpose interface

```typescript
// ✅ Good: Focused interfaces
interface Readable { read(): Data }
interface Writable { write(data: Data): void }

// ❌ Bad: Fat interface
interface FileOps {
  read(): Data
  write(data: Data): void
  delete(): void
  compress(): void
}
```

Why: Don't force unnecessary dependencies

### 5. Dependency Inversion Principle (DIP)

Depend on abstractions, not concretions

```typescript
// ✅ Good: Depend on interface
constructor(private logger: Logger) {}

// ❌ Bad: Depend on implementation
constructor(private fileLogger: FileLogger) {}
```

Why: High-level policies shouldn't depend on low-level details

## When to Apply

- Class/module design
- API boundaries
- Refactoring decisions
- Architecture planning

## Quick Decision Guide

- New feature? → Check OCP first
- Class too big? → Apply SRP
- Inheritance issues? → Verify LSP
- Too many methods? → Consider ISP
- Hard to test? → Apply DIP

## Integration with Other Principles

- With TDD: Design emerges through tests
- With DRY: Abstractions prevent duplication
- With Tidyings: Refactor toward SOLID

## Remember

"The only way to go fast is to go well" - Clean architecture enables speed

## Related Principles

### Core Principles (Same Level)

- [@~/.claude/rules/reference/OCCAMS_RAZOR.md](~/.claude/rules/reference/OCCAMS_RAZOR.md) - Simple designs often align with SRP
- [@~/.claude/rules/reference/DRY.md](~/.claude/rules/reference/DRY.md) - Abstractions prevent duplication
- [@~/.claude/rules/reference/MILLERS_LAW.md](~/.claude/rules/reference/MILLERS_LAW.md) - SRP respects cognitive limits

### Applied in Practice

- [@~/.claude/rules/development/TDD_RGRC.md](~/.claude/rules/development/TDD_RGRC.md) - Design emerges through tests
- [@~/.claude/rules/development/LAW_OF_DEMETER.md](~/.claude/rules/development/LAW_OF_DEMETER.md) - Complements SOLID principles
