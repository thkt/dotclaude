# Test Generation Patterns

Quick reference for test-generator agent. Full details in skill file.

## Full Reference

[@~/.claude/skills/generating-tdd-tests/SKILL.md#test-generator-agent-patterns](~/.claude/skills/generating-tdd-tests/SKILL.md#test-generator-agent-patterns)

## Patterns Overview

| Pattern | Use Case | Test State |
| --- | --- | --- |
| Spec-Driven | Feature development (`/code`) | Skip mode |
| Bug-Driven | Bug fixing (`/fix`) | Active mode |
| Coverage-Driven | Improve coverage | Active mode |

## Basic Invocation

```typescript
Task({
  subagent_type: "test-generator",
  model: "haiku",
  description: "Generate tests from [source]",
  prompt: `[detailed prompt with context]`
})
```

## Skip Markers

| Framework | Syntax |
| --- | --- |
| Jest/Vitest | `it.skip('test', () => { // TODO: [SKIP] FR-001 })` |
| Mocha | `it.skip()` or `xit()` |
| Unknown | Comment out with `// TODO: [SKIP]` |

## Command Integration

| Command | Pattern | Mode |
| --- | --- | --- |
| `/code` | Spec-Driven | Phase 0: skip, activate one-by-one |
| `/fix` | Bug-Driven | Phase 1.5: active regression test |

## Best Practices

- Specify framework in prompt
- One behavior per test
- Baby Steps order (simple → complex)
- Clear skip markers with FR-xxx

## References

- [@~/.claude/skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - Full patterns
- [@~/.claude/skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDD principles
