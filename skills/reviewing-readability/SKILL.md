---
name: reviewing-readability
description: >
  Code readability review based on "The Art of Readable Code" and Miller's Law (7±2).
  Triggers: 可読性, 理解しやすい, わかりやすい, 明確, 命名, 変数名, 関数名,
  ネスト, 深いネスト, 関数設計, コメント, 複雑, 難しい, 難読,
  Miller's Law, ミラーの法則, 認知負荷, AI-generated, 過剰設計.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
agent: readability-reviewer
user-invocable: false
---

# Readability Review - Code Clarity & Cognitive Load

Target: New team member understands code in < 1 minute.

## Miller's Law Limits (7±2)

| Context              | Ideal      | Maximum  |
| -------------------- | ---------- | -------- |
| Function arguments   | 3          | 5        |
| Class methods        | 5          | 7        |
| Conditional branches | 3          | 5        |
| Function length      | 5-10 lines | 15 lines |
| Nesting depth        | 2          | 3        |

## Section-Based Loading

| Section         | File                             | Focus                      | Triggers               |
| --------------- | -------------------------------- | -------------------------- | ---------------------- |
| Control Flow    | `references/control-flow.md`     | Nesting, guard clauses     | ネスト, Miller's Law   |
| Comments        | `references/comments-clarity.md` | Why not What, intent       | コメント, 意図         |
| AI Antipatterns | `references/ai-antipatterns.md`  | Over-engineering detection | AI-generated, 過剰設計 |

**Note**: Naming conventions → [@./references/naming.md](./references/naming.md)

## Quick Checklist

### Naming

- [ ] Concrete over abstract (`validateUserEmail` not `processData`)
- [ ] Searchable, pronounceable names
- [ ] Intent is obvious from name

### Control Flow

- [ ] Nesting depth ≤ 3
- [ ] Guard clauses for early returns
- [ ] Complex conditions extracted to functions

### Comments

- [ ] Explain "why", not "what"
- [ ] Update or delete outdated comments
- [ ] Code is self-documenting first

### AI Code Smells

- [ ] No premature abstractions (interface for single impl)
- [ ] No unnecessary classes for simple tasks
- [ ] No "future-proof" flexibility nobody asked for

## Key Principles

| Principle            | Application         |
| -------------------- | ------------------- |
| Clarity > Cleverness | Simple code wins    |
| Respect 7±2 limit    | Break into chunks   |
| Tell, Don't Ask      | Direct method calls |
