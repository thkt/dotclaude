---
paths:
  - "**/*.tsx"
  - "!**/*.test.*"
  - "!**/*.spec.*"
---

# React

## State Management

| Rule             | Detail                                                                    |
| ---------------- | ------------------------------------------------------------------------- |
| Local first      | useState/useReducer before reaching for a state management library        |
| Read/write split | Separate read hooks from write hooks to prevent unnecessary re-renders    |
| Derived state    | Compute in render or useMemo, not in extra store entries                  |
| Sync preferred   | Avoid async atoms/selectors unless fetching is the store's responsibility |

### Scope Selection

| Scope  | Tool          | Example            |
| ------ | ------------- | ------------------ |
| Local  | useState      | Form input, toggle |
| Shared | Context       | Theme, auth status |
| Global | Zustand/Redux | App-wide cache     |

## Memoization

Measurement-based only. No preemptive React.memo, useCallback, useMemo.

## Component Design

| Rule           | Detail                                    |
| -------------- | ----------------------------------------- |
| Shared UI      | Place in `components/ui/`                 |
| Props drilling | Max 2 levels, then Context or composition |

## Component Patterns

### Container/Presentational

| Role           | Responsibility     | Styles                                   |
| -------------- | ------------------ | ---------------------------------------- |
| Container      | Data, state, logic | Layout (grid, flex, spacing, sizing)     |
| Presentational | Props-only, UI     | Decorative (colors, borders, typography) |

Apply when data fetching meets display. Skip for one-off components (YAGNI).

### Anti-patterns

| Anti-pattern                           | Fix                            |
| -------------------------------------- | ------------------------------ |
| Presentational with `useState`/`fetch` | Lift state to Container        |
| Container with decorative styles       | Move styling to Presentational |

## Styling

| Rule                | Detail                                                                    |
| ------------------- | ------------------------------------------------------------------------- |
| Utility/token first | Use the project's CSS framework utilities before custom CSS               |
| Conditional classes | Use a class-merge utility (clsx, cva, cx, etc.), not string concatenation |
| Responsive          | Mobile-first breakpoints                                                  |

## Error Handling

| Layer         | Pattern                                                             |
| ------------- | ------------------------------------------------------------------- |
| Component     | Error Boundary wrapping route-level                                 |
| Async         | Result type (neverthrow, option-t, or equivalent) with early return |
| User feedback | Toast/dialog on error, never silent swallow                         |

## Accessibility

| Rule         | Standard                                      |
| ------------ | --------------------------------------------- |
| HTML         | Semantic elements first                       |
| ARIA         | Only when semantic HTML insufficient          |
| Keyboard     | All interactive elements focusable + operable |
| Contrast     | WCAG 2.2 AA minimum                           |
| Touch target | 44px minimum                                  |

## Testing

| Tool                  | Scope                                                   |
| --------------------- | ------------------------------------------------------- |
| Vitest                | Unit + integration                                      |
| React Testing Library | User-perspective assertions (no implementation details) |
| Storybook             | Visual + interaction tests for UI components            |
