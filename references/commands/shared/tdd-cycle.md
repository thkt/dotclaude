# TDD Cycle Implementation Details

Quick reference for RGRC cycle. Full details in skill file.

## Full Reference

[@~/.claude/skills/generating-tdd-tests/SKILL.md#rgrc-cycle](~/.claude/skills/generating-tdd-tests/SKILL.md#rgrc-cycle)

## Quick Reference

| Phase | Goal | Confidence | Max Time |
| --- | --- | --- | --- |
| 🔴 Red | Test fails for expected reason | 0.9 | 2 min |
| 🟢 Green | Minimal code to pass | 0.7 | 5 min |
| 🔵 Refactor | Clean without behavior change | 0.95 | 3 min |
| ✅ Commit | All checks pass | 1.0 | 1 min |

## Key Commands

```bash
# Red: Run specific test
npm test -- --testNamePattern="[test]"

# Green: Watch mode
npm test -- --watch --testNamePattern="[test]"

# Commit: All checks
npm run lint && npm test && npm run type-check
```

## Integration Points

| Command | TDD Usage |
| --- | --- |
| `/code` | Feature-driven with spec.md (Phase 0: skip mode) |
| `/fix` | Bug-driven with regression tests (active mode) |

## Common Mistakes

| Phase | Mistake | Fix |
| --- | --- | --- |
| Red | Test passes immediately | Ensure test checks actual behavior |
| Green | Over-implementing | Write only what test requires |
| Refactor | Changing behavior | Only structure changes |

## References

- [@~/.claude/skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - Full TDD guide
- [@~/.claude/rules/development/TDD_RGRC.md](~/.claude/rules/development/TDD_RGRC.md) - Methodology
