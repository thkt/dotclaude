# TDD/RGRC Quick Reference

Quick reference for generating-tdd-tests skill. Full methodology in primary sources.

## Full References

- [@~/.claude/skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - Complete TDD guide
- [@~/.claude/rules/development/TDD_RGRC.md](~/.claude/rules/development/TDD_RGRC.md) - TDD rules

## Baby Steps (2-Minute Cycle)

| Step | Time | Action |
| --- | --- | --- |
| 1 | 30s | Write smallest failing test |
| 2 | 1min | Make it pass minimally |
| 3 | 10s | Run tests |
| 4 | 30s | Tiny refactor if needed |
| 5 | 20s | Commit if green |

**Why**: Bug is always in last 2-minute change. Always seconds from green.

## RGRC Cycle

| Phase | Goal | Confidence |
| --- | --- | --- |
| 🔴 Red | Test fails for expected reason | 0.9 |
| 🟢 Green | Minimal code to pass | 0.7 |
| 🔵 Refactor | Clean without behavior change | 0.95 |
| ✅ Commit | All checks pass | 1.0 |

## Think Like t_wada

- Small steps teach specific lessons
- Speed reveals design issues early
- Verify failure reason is correct
- Each cycle is a learning opportunity

## Integration

| Command | Usage |
| --- | --- |
| `/code` | Feature-driven TDD (skip mode) |
| `/fix` | Bug-driven TDD (active mode) |
