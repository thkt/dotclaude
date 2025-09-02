# Progressive Enhancement

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
/* ✅ CSS Grid overlay */
.container { display: grid; }
.panel { grid-column: 1 / -1; grid-row: 1 / -1; }
```

## Apply for

Layout, positioning, show/hide, responsive, animations, visual states

## Remember

"The best code is no code" - If CSS can solve it, skip JS

## Outcome-First Development

**Core Principle**: Ship the outcome, not the architecture

### Implementation Phases

1. **Make it Work** - Solve the immediate problem
2. **Make it Resilient** - Add error handling when errors occur
3. **Make it Fast** - Optimize when slowness is measured
4. **Make it Flexible** - Add options when users request them

### Decision Framework

Before adding code, ask:

- Is this solving a real problem that exists now?
- Has this actually failed in production?
- Have users complained about this?
- Is there measured evidence of the issue?

If "No" → Don't add it yet

### The Progressive Enhancement Mindset

- Start with the happy path
- Add complexity only in response to reality
- Every line of code is a liability
- YAGNI is the default position

## Remember

"The best code is code that doesn't exist yet doesn't need to"
