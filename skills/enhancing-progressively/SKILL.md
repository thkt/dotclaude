---
name: enhancing-progressively
description: >
  CSS-first approach - use CSS before JavaScript. Triggers: レイアウト, スタイル,
  位置, アニメーション, 表示/非表示, トグル, レスポンシブ, CSS Grid, Flexbox,
  transforms, transitions, CSSのみ, JavaScript不要, シンプル
allowed-tools: [Read, Grep, Glob]
user-invocable: false
---

# Progressive Enhancement

Prefer CSS solutions over JavaScript. "The Best Code is No Code At All."

## Detection Items

| Category       | Targets                                  |
| -------------- | ---------------------------------------- |
| Layout         | JS-based positioning, sizing, spacing    |
| Animation      | JS transitions, timers for animation     |
| Visibility     | JS show/hide, toggle, modal control      |
| Responsiveness | JS media query handling, resize events   |
| State Styling  | JS class manipulation for visual changes |
| Scrolling      | JS scroll handling, infinite scroll      |
| Form Styling   | JS validation styling, input formatting  |

## Detection Patterns

| JS Pattern                   | CSS Alternative                    |
| ---------------------------- | ---------------------------------- |
| `element.style.display`      | CSS `:has()`, `[open]`, `<dialog>` |
| `addEventListener('resize')` | CSS `@media`, `clamp()`, `min()`   |
| `getBoundingClientRect`      | CSS Grid, Flexbox, `gap`           |
| `setInterval` for animation  | CSS `transition`, `@keyframes`     |
| `classList.toggle`           | CSS `:checked`, `:target`          |
| `scrollTo`, `scrollIntoView` | CSS `scroll-behavior: smooth`      |
| `matchMedia`                 | CSS `@media`, `@container`         |

## Quality Criteria

| Criteria                           | Target |
| ---------------------------------- | ------ |
| JS used only when CSS insufficient | ✓      |
| CSS alternatives documented        | ✓      |
| Performance impact considered      | ✓      |
| Browser support verified           | ✓      |

## Priority Order

| Priority | Solution | When to Use                        |
| -------- | -------- | ---------------------------------- |
| 1        | HTML     | Semantic elements, native inputs   |
| 2        | CSS      | Grid, Flexbox, :has(), transitions |
| 3        | JS       | Only when truly necessary          |
