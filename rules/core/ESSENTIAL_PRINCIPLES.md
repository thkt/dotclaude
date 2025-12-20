# Essential Principles - Quick Decision Questions

## Purpose

Compact, actionable decision questions for every implementation task.
Full details available in PRINCIPLES_GUIDE.md or individual principle files.

## Quick Decision Questions

### Occam's Razor / KISS

**"Is there a simpler way to achieve this?"**

- Fewest dependencies (prefer 0-2 over 3+)
- Fewer lines of code (prefer <50 per function)
- Lower complexity (prefer <5 branches)

### DRY

**"Am I duplicating knowledge or intent?"**

- Same business logic in multiple places?
- Configuration values repeated?
- Rule of Three: See it 3 times → refactor

### SOLID (SRP)

**"Does this class/module have a single, clear reason to change?"**

- One responsibility per unit
- Changes should be localized

### Miller's Law

**"Can a new team member understand this in <1 minute?"**

- Function parameters ≤ 5
- Class public methods ≤ 7
- Conditional branches ≤ 5

### YAGNI

**"Is this solving a real problem that exists now?"**

- Building for imagined future? → Don't
- Adding flexibility "just in case"? → Don't
- Optimizing without measurement? → Don't

## Decision Flow

```text
Before writing code:
1. Simplest solution? (Occam's Razor)
2. Already exists? (DRY)
3. One responsibility? (SRP)
4. Understandable? (Miller's Law)
5. Needed now? (YAGNI)

If any answer is "no" → reconsider approach
```

## Red Flags

- Method chains > 3 levels
- Can't understand in 1 minute
- Implementing "just in case"
- Complex solution first

## Reference

For detailed explanations, see:
[@../PRINCIPLES_GUIDE.md](../PRINCIPLES_GUIDE.md) or individual principle files in [@../reference/](../reference/)
