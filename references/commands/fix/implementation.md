# Implementation (Phase 2)

Implement the minimal fix based on confidence level.

## Purpose

Apply the fix with appropriate defensive measures based on confidence in root cause analysis.

## Confidence-Based Approach

Choose implementation strategy based on confidence from Phase 1:

| Confidence | Strategy | Approach |
| --- | --- | --- |
| **High (>0.9)** | Direct fix | Implement straightforward solution |
| **Medium (0.7-0.9)** | Defensive fix | Add checks and guards |
| **Low (<0.7)** | Escalate | Switch to `/research` or `/think` |

## High Confidence Implementation (>0.9)

Root cause is clear, fix is straightforward.

### Approach

- Implement direct solution
- Focus on the identified problem
- Keep changes minimal

### Example

```typescript
// Root cause: No check for negative result
function calculateTotal(price, discount) {
  const result = price - discount;
  return Math.max(0, result); // Good: Direct fix
}
```

## Medium Confidence Implementation (0.7-0.9)

Root cause likely but not certain, add defensive measures.

### Approach

- Implement fix with guards
- Add input validation
- Include logging for debugging

### Example

```typescript
// Add defensive checks
function calculateTotal(price, discount) {
  // Validate inputs
  if (price < 0 || discount < 0) {
    console.warn('Invalid pricing values', { price, discount });
    return 0;
  }

  const result = price - discount;
  return Math.max(0, result);
}
```

## Low Confidence (<0.7) - Escalation

When confidence is low, don't guess:

### Escalation Paths

1. **Need Investigation** → `/research`

   ```text
   /research "Why does discount calculation return negative?"
   ```

2. **Need Design** → `/think` → `/code`

   ```text
   /think "Redesign pricing system with proper validation"
   ```

3. **Need Discussion** → Ask user
   - Clarify requirements
   - Discuss edge cases
   - Confirm expected behavior

## Apply Occam's Razor

**Principle**: Choose the simplest solution that solves the problem.

### Good - Simple Solution

```typescript
// Problem: Can return negative
// Solution: Ensure non-negative
function calculateTotal(price, discount) {
  return Math.max(0, price - discount);
}
```

### Bad - Over-engineered

```typescript
// Problem: Can return negative
// Solution: Complex validation framework (YAGNI!)
class PricingValidator {
  validate(price: number, discount: number): ValidationResult {
    // ... 50 lines of validation logic
  }
}
```

**Remember**: Fix the bug, don't rebuild the system (unless `/think` determines that's needed).

## Don't Restructure Surrounding Code

### Good - Targeted Fix

```typescript
// Only change what's needed
function calculateTotal(price, discount) {
  return Math.max(0, price - discount); // ← Only this line changed
}

// Leave surrounding code as-is
function applyTax(total, rate) {
  return total * (1 + rate);
}
```

### Bad - Unnecessary Refactoring

```typescript
// Don't refactor unrelated code during bug fix
function calculateTotal(price, discount) {
  return Math.max(0, price - discount);
}

// Bad: Don't "improve" unrelated functions
function applyTax(total, rate) {
  // Refactored for "consistency" - NOT part of the fix!
  const taxAmount = total * rate;
  return total + taxAmount;
}
```

**Save refactoring for the Refactor phase or separate PR.**

## CSS-First for UI Issues

If the bug is UI/visual:

### Priority Order

1. **CSS** - Try pure CSS solution first
2. **HTML** - Adjust markup if CSS insufficient
3. **JavaScript** - Only if CSS/HTML can't solve it

### Example

```css
/* Good: - CSS solution for layout bug */
.container {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
```

```javascript
// Bad: Bad - JavaScript for CSS problem
function layoutFix() {
  const container = document.querySelector('.container');
  container.style.display = 'flex';
  // ... 20 lines of layout logic
}
```

## Implementation Checklist

Before proceeding to Phase 3:

- [ ] Fix addresses root cause (not just symptom)
- [ ] Regression test now passes
- [ ] No other tests broken
- [ ] Changes are minimal
- [ ] Confidence level appropriate
- [ ] Occam's Razor applied

## When in Doubt

If uncertain about the fix:

1. **Check regression test** - Does it pass?
2. **Run all tests** - Anything broken?
3. **Ask yourself** - Is this the simplest solution?

If answer to any is "no" or "unsure" → revisit approach.

## Output Format

```markdown
Fix Implemented

Approach: [Direct/Defensive]
Changes: [Brief description]
Files: [Modified files]
Confidence: 0.XX

Status:
- [✓] Regression test passes
- [✓] No tests broken
- [✓] Minimal changes

Next: Verification (Phase 3)
```

## Integration Points

- **Previous**: Phase 1.5 (Regression Test)
- **Next**: Phase 3 (Verification)
- **Escalate**: `/research` or `/think` if confidence < 0.7

## Related Principles

- [@~/.claude/skills/applying-code-principles/SKILL.md](~/.claude/skills/applying-code-principles/SKILL.md) - Simplicity principle
- [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md) - CSS-first approach
