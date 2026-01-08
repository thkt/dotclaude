---
paths: "**/*.{css,scss,tsx,jsx,html,md}"
summary: |
  Start with minimal viable implementation, enhance based on real needs.
  YAGNI (You Aren't Gonna Need It) is default. Add complexity only when
  measured problems occur, not imagined futures.
decision_question: "Is this solving a real problem that exists now?"
---

# Progressive Enhancement - Outcome-First Development

**Default approach**: Build simple → enhance progressively

## Core Philosophy

- **Root Cause**: "Why?" not "How to fix?"
- **Prevention > Patching**: Best solution prevents the problem
- **Simple > Complex**: Elegance = solving right problem

## Priority

1. **HTML** - Structure
2. **CSS** - Visual/layout
3. **JavaScript** - Only when necessary

## CSS-First Solutions

- **Layout**: Grid/Flexbox
- **Position**: Transform (no reflow)
- **Show/Hide**: visibility/opacity
- **Responsive**: Media/Container queries
- **State**: :target, :checked, :has()

## Example

```css
/* Good: CSS Grid overlay */
.container {
  display: grid;
}
.panel {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
}
```

## Apply for

Layout, positioning, show/hide, responsive, animations, visual states

## Remember

"The best code is no code" - If CSS can solve it, skip JS

## Related Principles

- [@../../skills/applying-code-principles/SKILL.md](../../skills/applying-code-principles/SKILL.md) - Occam's Razor and simplicity principles

## Outcome-First Development

**Core Principle**: Ship the outcome, not the architecture

### Implementation Phases

| Phase             | Action                  | Trigger                |
| ----------------- | ----------------------- | ---------------------- |
| Make it Work      | Solve immediate problem | Always first           |
| Make it Resilient | Add error handling      | When errors occur      |
| Make it Fast      | Optimize                | When slowness measured |
| Make it Flexible  | Add options             | When users request     |

### Decision Framework

| Question                       | If "No"   |
| ------------------------------ | --------- |
| Solving a real problem now?    | Don't add |
| Actually failed in production? | Don't add |
| Users complained?              | Don't add |
| Measured evidence?             | Don't add |

### The Progressive Enhancement Mindset

| Principle         | Action                          |
| ----------------- | ------------------------------- |
| Happy path first  | Start simple                    |
| Reality-driven    | Add complexity only when needed |
| Code as liability | Every line has cost             |
| YAGNI default     | Don't build speculatively       |

## Key Takeaway

"The best code is code that doesn't need to exist"

## Related Principles

See: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md#development-practices)
