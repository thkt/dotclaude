# Test-Driven Development like t_wada

## Core Philosophy

When implementing new features or fixing bugs, think and act like t_wada - use strict Red-Green-Refactor-Commit (RGRC) cycles and understand deeply why each step matters.

**Ultimate Goal**: "Clean code that works" - Ron Jeffries

## TDD Process Overview

1. **Create test scenario list** - Break down into small testable units, track with TodoWrite
2. **Execute RGRC cycles** - One scenario at a time, smallest steps, iterate quickly

## Baby Steps - The Foundation of TDD

### Core Philosophy

**Make the smallest possible change at each step** - This is the key to successful TDD

### Why Baby Steps Matter

- **Immediate error localization**: When test fails, the cause is in the last tiny change
- **Continuous working state**: Code is always seconds away from green
- **Rapid feedback**: Each step takes 1-2 minutes max
- **Confidence building**: Small successes compound into major features

### Baby Steps in Practice

```typescript
// ❌ Big Step - Multiple changes at once
function calculateTotal(items, tax, discount) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const afterTax = subtotal * (1 + tax);
  const afterDiscount = afterTax * (1 - discount);
  return afterDiscount;
}

// ✅ Baby Steps - One change at a time
// Step 1: Return zero (make test pass minimally)
function calculateTotal(items) {
  return 0;
}

// Step 2: Basic sum (next test drives this)
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Step 3: Add tax support (only when test requires it)
// ... continue in tiny increments
```

### Baby Steps Rhythm

1. **Write smallest failing test** (30 seconds)
2. **Make it pass with minimal code** (1 minute)
3. **Run tests** (10 seconds)
4. **Tiny refactor if needed** (30 seconds)
5. **Commit if green** (20 seconds)

Total cycle: ~2 minutes

## RGRC Cycle Implementation

1. **Red Phase - Write failing test first**

   ```bash
   npm test
   ```

   Write test → Verify it fails correctly → Be specific and focused

2. **Green Phase - Minimal implementation**

   ```bash
   npm test
   ```

   Just enough code to pass → "You can sin" → Resist extra features

3. **Refactor Phase - Improve code quality**

   ```bash
   npm test
   ```

   Remove duplication → Improve structure/readability → Keep tests green always

4. **Commit Phase - Save progress**

   ```bash
   git add -A && git commit -m "feat: [description] (RGRC complete)"
   ```

   Include test + implementation → Reference RGRC in message

## Think Like t_wada

- **Small steps**: "Why make steps small?" - Each step teaches something specific
- **Fast iterations**: "Can we make this cycle faster?" - Speed reveals design issues early
- **Test failure reasons**: "Is it failing for the right reason?" - Wrong failure means wrong understanding
- **Learning through practice**: "What did we learn from this cycle?" - Each cycle is a learning opportunity, not just progress

## Integration with TodoWrite

Example workflow:

```markdown
# Test Scenario List
1. ⏳ User can register with email and password
2. ⏳ Registration fails with invalid email
3. ⏳ Registration fails with weak password
4. ⏳ Cannot register with existing email

# Current RGRC Cycle (for Scenario 1)
1.1 ❌ Red: Write failing test for user registration
1.2 ⏳ Green: Implement minimal registration logic
1.3 ⏳ Refactor: Extract validation logic
1.4 ⏳ Commit: Save registration implementation
```

## When to Skip TDD

Skip for: Prototypes, External APIs (use mocks), Throwaway scripts

## Benefits in Claude Code

Clear boundaries per phase, Prevents overengineering, Self-documenting tests, Natural checkpoints

## Related Principles

- [@../reference/OCCAMS_RAZOR.md] - Baby Steps embody the simplicity principle
