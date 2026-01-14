# Progressive Enhancement

**Default approach**: Build simple → enhance progressively

## Core Philosophy

- **Root Cause**: "Why?" not "How to fix?"
- **Prevention > Patching**: Best solution prevents the problem
- **Simple > Complex**: Elegance = solving the right problem

## CSS-First Principle

Before writing JavaScript, ask: "Can CSS solve this?"

| Priority | Solution | Examples                           |
| -------- | -------- | ---------------------------------- |
| 1        | HTML     | Semantic elements, native inputs   |
| 2        | CSS      | Grid, Flexbox, :has(), transitions |
| 3        | JS       | Only when truly necessary          |

## Outcome-First Development

**Core Principle**: Ship the outcome, not the architecture

| Phase             | Action                  | Trigger                |
| ----------------- | ----------------------- | ---------------------- |
| Make it Work      | Solve immediate problem | Always first           |
| Make it Resilient | Add error handling      | When errors occur      |
| Make it Fast      | Optimize                | When slowness measured |
| Make it Flexible  | Add options             | When users request     |

## Key Takeaway

"The Best Code is No Code At All."
