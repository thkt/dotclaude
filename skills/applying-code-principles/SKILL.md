---
name: applying-code-principles
description: >
  Fundamental software principles - SOLID, DRY, Occam's Razor, Miller's Law, YAGNI, Readable Code.
  Triggers: 原則, シンプル, 複雑, アーキテクチャ, リファクタリング, 保守性, コード品質,
  design pattern, best practice, clean code
allowed-tools: [Read, Grep, Glob]
user-invocable: false
---

# Code Principles

## Priority Order

| Priority | Principle     | When to Apply                                  |
| -------- | ------------- | ---------------------------------------------- |
| 1        | Safety First  | Security, data integrity                       |
| 2        | YAGNI         | Don't build what you don't need                |
| 3        | Occam's Razor | Simplest solution                              |
| 4        | SOLID         | For complex systems                            |
| 5        | DRY           | Eliminate duplication (not at cost of clarity) |
| 6        | Miller's Law  | Respect 7±2 cognitive limit                    |

## Quick Checks

| Question                  | Principle   |
| ------------------------- | ----------- |
| Simpler way?              | Occam       |
| Understandable in <1 min? | Miller      |
| Duplicating knowledge?    | DRY         |
| Needed now?               | YAGNI       |
| Single reason to change?  | SRP (SOLID) |

## Thresholds

| Target        | Ideal | Max | Limit |
| ------------- | ----- | --- | ----- |
| Function args | 3     | 5   | 7     |
| Class methods | 5     | 7   | 9     |
| Conditionals  | 3     | 5   | 7     |

## Rules

| Principle | Rule                                           |
| --------- | ---------------------------------------------- |
| DRY       | Abstract on 3rd duplication (Rule of Three)    |
| SOLID     | Interface only when 2nd implementation appears |
| YAGNI     | Build only if problem exists now               |
| Readable  | New team member understands in < 1 minute      |
