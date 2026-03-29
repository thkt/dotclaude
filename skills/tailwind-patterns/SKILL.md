---
name: tailwind-patterns
description: >
  Tailwind CSS v4 design decisions. Use when: Tailwind, utility-first,
  container query, design tokens, dark mode strategy.
allowed-tools: [Read, Grep, Glob]
user-invocable: false
---

# Tailwind Patterns

Design-level decisions that linters cannot catch.

## Topic Index

| Topic                | Key Point                                                      |
| -------------------- | -------------------------------------------------------------- |
| Container Query      | Reusable component → `@container`, page layout → viewport      |
| Color Token          | Primitive + Semantic minimum. Arbitrary values = missing token |
| Dark Mode            | v4: `@custom-variant` in CSS, no `darkMode` config key         |
| Layout Selection     | flex (1-axis), grid (2D), grid+spans (Bento)                   |
| Component Extraction | Same class combo 3+ times → extract. No `@apply` in v4         |
| Anti-Patterns        | No dynamic class strings, no `!important`, no arbitrary values |
| v4 CSS-First Config  | `@theme` in CSS replaces `tailwind.config.js`                  |

→ Details: [Container Query](reference.md#container-query-vs-viewport),
[Color Token](reference.md#color-token-architecture),
[Dark Mode](reference.md#dark-mode-strategy),
[Layout](reference.md#layout-selection),
[Component Extraction](reference.md#component-extraction),
[Anti-Patterns](reference.md#anti-patterns),
[v4 Config](reference.md#v4-css-first-config)
