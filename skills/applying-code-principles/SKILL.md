---
name: applying-code-principles
description: >
  Fundamental software principles - SOLID, DRY, Occam's Razor, Miller's Law,
  YAGNI, Readable Code. Use when applying design principles, refactoring code,
  or when user mentions 原則, シンプル, 複雑, リファクタリング, 保守性, clean
  code, best practice.
allowed-tools: [Read, Grep, Glob]
user-invocable: false
---

# Code Principles

Priority, thresholds, conflict resolution: see `rules/PRINCIPLES.md` and
`rules/development/CODE_THRESHOLDS.md`.

## Quick Checks

| Question              | Principle               |
| --------------------- | ----------------------- |
| Simpler way?          | Occam's Razor           |
| <1 min to understand? | Miller's Law            |
| Duplicating?          | DRY                     |
| Needed now?           | YAGNI                   |
| CSS can do it?        | Progressive Enhancement |

## Rules

| Principle               | Rule                                           |
| ----------------------- | ---------------------------------------------- |
| DRY                     | Abstract on 3rd duplication (Rule of Three)    |
| SOLID                   | Interface only when 2nd implementation appears |
| YAGNI                   | Build only if problem exists now               |
| Readable                | New team member understands in < 1 minute      |
| Progressive Enhancement | HTML → CSS → JS (prefer earlier layer)         |
