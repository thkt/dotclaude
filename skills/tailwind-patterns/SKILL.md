---
name: tailwind-patterns
description: >
  Tailwind CSS v4 design decision reference for code reviews. Use when reviewing
  Tailwind usage, choosing layout strategies, or when user mentions Tailwind,
  utility-first, container query, design tokens, dark mode strategy.
allowed-tools: [Read, Grep, Glob]
user-invocable: false
---

# Tailwind Patterns

Design-level decisions that linters cannot catch.

## Container Query vs Viewport

| Scenario              | Use                        | Why                    |
| --------------------- | -------------------------- | ---------------------- |
| Page-level layout     | Viewport (`md:`, `lg:`)    | Depends on screen size |
| Reusable component    | Container (`@sm:`, `@md:`) | Context-independent    |
| Sidebar/panel content | Container                  | Parent width varies    |
| Top-level nav/footer  | Viewport                   | Always full-width      |

```html
<!-- Container: parent defines boundary -->
<div class="@container">
 <div class="@sm:flex @md:grid @md:grid-cols-2">...</div>
</div>
```

Named containers for specificity: `@container/card`

## Color Token Architecture

| Layer     | Example            | Purpose                                    |
| --------- | ------------------ | ------------------------------------------ |
| Primitive | `--color-blue-500` | Raw color values                           |
| Semantic  | `--color-primary`  | Purpose-based naming                       |
| Component | `--button-bg`      | Component-specific (`:root`, not `@theme`) |

Review checklist:

- Arbitrary color values (`bg-[#3b82f6]`) = missing design token
- OKLCH preferred over RGB/HSL (perceptually uniform)
- Component layer optional; Primitive + Semantic is minimum

```css
@theme {
 --color-primary: oklch(0.7 0.15 250);
 --color-surface: oklch(0.98 0 0);
}
```

## Dark Mode Strategy

v4 uses `@custom-variant` in CSS (no `darkMode` config key).

| Strategy                | CSS Config                                                                | Use When                 |
| ----------------------- | ------------------------------------------------------------------------- | ------------------------ |
| OS preference (default) | No config needed                                                          | No manual control        |
| Class toggle            | `@custom-variant dark (&:where(.dark, .dark *));`                         | User-controlled switcher |
| Data attribute          | `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` | Multiple themes          |

Consistent pairing pattern:

| Element    | Light             | Dark                   |
| ---------- | ----------------- | ---------------------- |
| Background | `bg-white`        | `dark:bg-zinc-900`     |
| Text       | `text-zinc-900`   | `dark:text-zinc-100`   |
| Border     | `border-zinc-200` | `dark:border-zinc-700` |

## Layout Selection

| Pattern                                          | When                                       |
| ------------------------------------------------ | ------------------------------------------ |
| `flex`                                           | Single-axis alignment, nav bars, centering |
| `grid`                                           | Two-dimensional, card grids, page layout   |
| `grid` + spans                                   | Asymmetric/Bento layouts                   |
| `grid-cols-[repeat(auto-fit,minmax(250px,1fr))]` | Responsive card grid without breakpoints   |

Prefer asymmetric/Bento over symmetric N-column grids.

## Component Extraction

| Signal                    | Action               |
| ------------------------- | -------------------- |
| Same class combo 3+ times | Extract to component |
| Complex state variants    | Extract to component |
| Design system element     | Extract + document   |

| Method                   | Use When                |
| ------------------------ | ----------------------- |
| React/Vue component      | Dynamic behavior needed |
| Design tokens (`@theme`) | Reusable values only    |

`@apply` has limitations in v4 and is not recommended. Prefer component
extraction.

## Anti-Patterns

| Don't                          | Do                   | Why                                  |
| ------------------------------ | -------------------- | ------------------------------------ |
| Arbitrary values everywhere    | Use `@theme` scale   | Inconsistent design                  |
| `!important`                   | Fix specificity      | Maintenance nightmare                |
| Inline `style=` with utilities | Utilities only       | Breaks purging                       |
| Duplicate long class lists     | Extract component    | DRY violation                        |
| `@apply` usage                 | Component extraction | Limited in v4, defeats utility-first |
| Dynamic class strings          | Static full classes  | Breaks tree-shaking                  |

```tsx
// BAD: dynamic class string (not purgeable)
<div className={`text-${color}-500`} />;

// GOOD: full static classes
const colorMap = { red: "text-red-500", blue: "text-blue-500" } as const;
<div className={colorMap[color]} />;
```

## v4 CSS-First Config

v4 uses `@theme` in CSS instead of `tailwind.config.js`. All tokens are CSS
variables.

```css
@theme {
 --spacing: 0.25rem; /* base unit: p-4 = 4 * 0.25rem = 1rem */
 --font-sans: "Inter", system-ui, sans-serif;
}
```

Review point: `tailwind.config.js` in a v4 project = likely unmigrated config.
