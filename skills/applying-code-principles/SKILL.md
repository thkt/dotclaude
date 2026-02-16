---
name: applying-code-principles
description: >
  Fundamental software principles - SOLID, DRY, Occam's Razor, Miller's Law, YAGNI, Readable Code.
  Use when applying design principles, refactoring code, or when user mentions
  原則, シンプル, 複雑, リファクタリング, 保守性, clean code, best practice.
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

| Question              | Principle     |
| --------------------- | ------------- |
| Simpler way?          | Occam's Razor |
| <1 min to understand? | Miller's Law  |
| Duplicating?          | DRY           |
| Needed now?           | YAGNI         |

## Thresholds

| Target                | Recommended | Warning | Maximum |
| --------------------- | ----------- | ------- | ------- |
| Function lines        | ≤30         | 31-50   | 50      |
| File lines            | ≤400        | 401-800 | 800     |
| Nesting depth         | ≤3          | 4       | 4       |
| Function arguments    | ≤3          | 4-5     | 5       |
| Cyclomatic complexity | ≤10         | 11-15   | 15      |
| Class methods         | ≤5          | 6-7     | 9       |
| Conditionals          | ≤3          | 4       | 5       |

Exceptions: auto-generated code, data definitions, test files, legacy in migration.

## Conflict Resolution

| Conflict                | Resolution     |
| ----------------------- | -------------- |
| DRY vs Readable         | Readable wins  |
| SOLID vs Simple         | Simple wins    |
| Perfect vs Working      | Working wins   |
| Abstraction vs Concrete | Start concrete |

When in doubt: simple > clever, concrete > abstract, working > perfect, clear > DRY.

## Rules

| Principle | Rule                                           |
| --------- | ---------------------------------------------- |
| DRY       | Abstract on 3rd duplication (Rule of Three)    |
| SOLID     | Interface only when 2nd implementation appears |
| YAGNI     | Build only if problem exists now               |
| Readable  | New team member understands in < 1 minute      |
