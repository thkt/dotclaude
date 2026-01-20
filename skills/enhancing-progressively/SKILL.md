---
name: enhancing-progressively
description: >
  CSS-first approach - use CSS before JavaScript.
  Use when implementing layouts, animations, or toggles, or when user mentions
  レイアウト, スタイル, 位置, アニメーション, 表示/非表示, トグル, レスポンシブ,
  CSS Grid, Flexbox, transforms, transitions, CSSのみ, JavaScript不要, シンプル
allowed-tools: [Read, Grep, Glob]
user-invocable: false
---

# Progressive Enhancement

## Priority

| Priority | Approach | Examples                           |
| -------- | -------- | ---------------------------------- |
| 1        | HTML     | Semantic elements, native inputs   |
| 2        | CSS      | Grid, Flexbox, :has(), transitions |
| 3        | JS       | Only when truly necessary          |

## Detection

| JS Pattern                   | CSS Alternative                    |
| ---------------------------- | ---------------------------------- |
| `element.style.display`      | CSS `:has()`, `[open]`, `<dialog>` |
| `addEventListener('resize')` | CSS `@media`, `clamp()`, `min()`   |
| `getBoundingClientRect`      | CSS Grid, Flexbox, `gap`           |
| `setInterval` for animation  | CSS `transition`, `@keyframes`     |
| `classList.toggle`           | CSS `:checked`, `:target`          |
| `scrollTo`, `scrollIntoView` | CSS `scroll-behavior: smooth`      |
| `matchMedia`                 | CSS `@media`, `@container`         |
