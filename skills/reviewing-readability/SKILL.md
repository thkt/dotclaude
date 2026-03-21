---
name: reviewing-readability
description: >
  Code readability review. Use when: 可読性, 明確, 命名, 変数名, 関数名,
  ネスト, 関数設計, コメント, 複雑, Miller's Law, ミラーの法則, 認知負荷,
  AI-generated, 過剰設計. Do NOT use for security (reviewing-security),
  type errors (reviewing-type-safety), error handling
  (reviewing-silent-failures), or test design (reviewing-testability).
allowed-tools: [Read, Grep, Glob, Task]
agent: code-quality-reviewer
context: fork
user-invocable: false
---

# Readability Review

Thresholds: see `rules/development/CODE_THRESHOLDS.md`.

## Detection

| ID  | Pattern                       | Fix                              |
| --- | ----------------------------- | -------------------------------- |
| RD1 | `processData()` (vague)       | `validateUserEmail()`            |
| RD1 | Misleading identifiers        | Names reveal intent              |
| RD2 | Nesting > 3 levels            | Guard clauses, extract functions |
| RD2 | Function > 30 lines           | Decompose                        |
| RD3 | Comment: `// increment i`     | Delete (self-evident)            |
| RD3 | Comment: `// TODO: fix later` | Create issue or fix now          |
| RD4 | Interface for single impl     | Remove until 2nd impl            |
| RD4 | Class for stateless logic     | Pure function                    |
| RD5 | > 5 function parameters       | Config object or decompose       |

## References

| Topic           | File                                                 |
| --------------- | ---------------------------------------------------- |
| Control Flow    | `${CLAUDE_SKILL_DIR}/references/control-flow.md`     |
| Comments        | `${CLAUDE_SKILL_DIR}/references/comments-clarity.md` |
| AI Antipatterns | `${CLAUDE_SKILL_DIR}/references/ai-antipatterns.md`  |
| Naming          | `${CLAUDE_SKILL_DIR}/references/naming.md`           |
