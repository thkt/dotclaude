---
name: enhancing-progressively
description: >
  CSS-first approach - use CSS before JavaScript. Triggers: レイアウト, スタイル,
  位置, アニメーション, 表示/非表示, トグル, レスポンシブ, CSS Grid, Flexbox,
  transforms, transitions, CSSのみ, JavaScript不要, シンプル
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Progressive Enhancement

## Purpose

Prefer CSS solutions over JavaScript. "The best code is no code."

## Priority

1. **HTML** - Structure and semantics
2. **CSS** - Visual presentation and layout
3. **JavaScript** - Only when truly necessary

## CSS-First Decision Flow

| Need | CSS Solution | Avoid JS |
| --- | --- | --- |
| Layout | Grid / Flexbox | Manual position calculation |
| Position change | `transform` (GPU accelerated) | `top/left` (causes reflow) |
| Show/Hide | `visibility` / `opacity` | `display` toggle |
| State change | `:target` / `:checked` / `:has()` | `setState`, `toggleClass` |
| Responsive | Media / Container queries | `window.innerWidth` |
| Animation | `transition` / `animation` | `requestAnimationFrame` |

## Native HTML First

Use built-in browser elements:

- `<details>` / `<summary>` - Accordion (no JS)
- `<dialog>` - Modal (minimal JS: `showModal()`)
- `[data-tooltip]` + CSS `::after` - Tooltip (no JS)

## When JavaScript IS Required

CSS cannot handle:

- API data fetching
- Form submission / validation
- Complex multi-interaction state
- Dynamic content generation
- Browser APIs (localStorage, WebSocket, etc.)

## Decision Questions

Before writing JS, ask:

1. **"Can CSS solve this?"** → Check the decision flow above
2. **"Is this needed now?"** (YAGNI) → No evidence = don't implement
3. **"Simplest solution?"** (Occam's Razor) → 3 lines CSS > 50 lines JS

## References

### Principles (rules/)

- [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md) - CSS-first approach, outcome-first development
- [@~/.claude/skills/applying-code-principles/SKILL.md](~/.claude/skills/applying-code-principles/SKILL.md) - Simplest solution wins
- [@~/.claude/skills/applying-code-principles/SKILL.md](~/.claude/skills/applying-code-principles/SKILL.md) - Build only what's needed

### Related Skills

- `applying-code-principles` - SOLID, DRY原則
- `optimizing-performance` - パフォーマンス最適化

### Used by Commands

- `/code --frontend` - フロントエンド実装時
- `/audit` - CSS-first アプローチ確認
