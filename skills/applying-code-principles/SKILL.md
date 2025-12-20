---
name: applying-code-principles
description: >
  Fundamental software principles - SOLID, DRY, Occam's Razor, Miller's Law, YAGNI.
  Triggers: 原則, シンプル, 複雑, アーキテクチャ, リファクタリング, 保守性, コード品質,
  design pattern, best practice, clean code
allowed-tools: Read, Grep, Glob
---

# Code Principles

## Purpose

Apply SOLID, DRY, Occam's Razor, Miller's Law, YAGNI with project-specific priority.

## Project Priority Order

When principles conflict:

1. **Safety First** - Security, data integrity
2. **YAGNI** - Don't build what you don't need
3. **Occam's Razor** - Simplest solution
4. **SOLID** - For complex systems
5. **DRY** - Eliminate duplication (not at cost of clarity)
6. **Miller's Law** - Respect 7±2 cognitive limit

## Quick Decision Questions

- "Is there a simpler way?" (Occam's Razor)
- "Understandable in <1 min?" (Miller's Law)
- "Duplicating knowledge?" (DRY)
- "Needed now?" (YAGNI)

## References

Detailed explanations (Claude already knows these concepts):

- [@~/.claude/rules/reference/SOLID.md] - SRP, OCP, LSP, ISP, DIP
- [@~/.claude/rules/reference/DRY.md] - Knowledge duplication, Rule of Three
- [@~/.claude/rules/reference/OCCAMS_RAZOR.md] - KISS, simplicity principle
- [@~/.claude/rules/reference/MILLERS_LAW.md] - Cognitive limits (7±2)
- [@~/.claude/rules/reference/YAGNI.md] - Outcome-first development
