---
paths: "**/*.{ts,tsx,js,jsx}"
---

# Test-Driven Development like t_wada

> **Core Concept**: Red → Green → Refactor → Commit (Baby Steps)

## Quick Summary

| Phase | Action | Duration |
| --- | --- | --- |
| Red | Write failing test | <2 min |
| Green | Minimal code to pass | <5 min |
| Refactor | Clean up | <3 min |
| Commit | Save progress | <1 min |

**Key Principle**: Each cycle should be <10 minutes total.

---

## Core Philosophy

When implementing new features or fixing bugs, think and act like t_wada - use strict Red-Green-Refactor-Commit (RGRC) cycles and understand deeply why each step matters.

**Ultimate Goal**: "Clean code that works" - Ron Jeffries

## TDD Process Overview

1. **Create test scenario list** - Break down into small testable units, track with TodoWrite
2. **Execute RGRC cycles** - One scenario at a time, smallest steps, iterate quickly

## Baby Steps

The foundation of TDD. Full details with examples:

[@../../skills/generating-tdd-tests/SKILL.md#baby-steps---the-foundation](../../skills/generating-tdd-tests/SKILL.md#baby-steps---the-foundation)

**Quick Reference:**

| Step | Time | Action |
| --- | --- | --- |
| 1 | 30s | Write smallest failing test |
| 2 | 1min | Make it pass minimally |
| 3 | 10s | Run tests |
| 4 | 30s | Tiny refactor if needed |
| 5 | 20s | Commit if green |

## RGRC Cycle

| Phase | Command | Focus |
| --- | --- | --- |
| [Red] | `npm test` | Write test → Verify it fails correctly |
| [Green] | `npm test` | Minimal code to pass → "You can sin" |
| [Refactor] | `npm test` | Remove duplication → Keep tests green |
| [Commit] | `git commit` | Include test + implementation |

For detailed phase guidance with exit criteria:
[@../../skills/generating-tdd-tests/SKILL.md#rgrc-cycle](../../skills/generating-tdd-tests/SKILL.md#rgrc-cycle)

## Think Like t_wada

- **Small steps**: "Why make steps small?" - Each step teaches something specific
- **Fast iterations**: "Can we make this cycle faster?" - Speed reveals design issues early
- **Test failure reasons**: "Is it failing for the right reason?" - Wrong failure means wrong understanding
- **Learning through practice**: "What did we learn from this cycle?" - Each cycle is a learning opportunity

## Integration with TodoWrite

```markdown
# Test Scenario List
1. [pending] User can register with email and password
2. [pending] Registration fails with invalid email

# Current RGRC Cycle (for Scenario 1)
1.1 [in_progress] Red: Write failing test
1.2 [pending] Green: Implement minimal logic
1.3 [pending] Refactor: Extract validation
1.4 [pending] Commit: Save implementation
```

## When to Skip TDD

Skip for: Prototypes, External APIs (use mocks), Throwaway scripts

## Test Design Techniques

For systematic test design (Equivalence Partitioning, Boundary Value, Decision Tables):

[@../../skills/generating-tdd-tests/SKILL.md#test-design-techniques](../../skills/generating-tdd-tests/SKILL.md#test-design-techniques)

**Quick Steps:**

1. Identify partitions (equivalence classes)
2. Find boundaries (edges)
3. Use decision tables for 3+ conditions

## Related Principles

See: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md)
