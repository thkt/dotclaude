# TDD Cycle (RGRC)

## Quick Reference

| Phase    | Goal                           | Max Time |
| -------- | ------------------------------ | -------- |
| Red      | Test fails for expected reason | 2 min    |
| Green    | Minimal code to pass           | 5 min    |
| Refactor | Clean without behavior change  | 3 min    |
| Commit   | All checks pass                | 1 min    |

## Baby Steps (2-Minute Cycle)

| Step | Time | Action                      |
| ---- | ---- | --------------------------- |
| 1    | 30s  | Write smallest failing test |
| 2    | 1min | Make it pass minimally      |
| 3    | 10s  | Run tests                   |
| 4    | 30s  | Tiny refactor (if needed)   |
| 5    | 20s  | Commit if green             |

**Why**: Bug is always in last 2-minute change.

## Phase Details

| Phase    | Key Action                             | Common Mistake          |
| -------- | -------------------------------------- | ----------------------- |
| Red      | Verify failure matches intent          | Test passes immediately |
| Green    | Write **minimal** code ("you can sin") | Over-implementing       |
| Refactor | Apply SOLID, DRY, Occam                | Changing behavior       |
| Commit   | Run all quality checks                 | Skipping checks         |

## Commands

```bash
npm test -- --testNamePattern="[test]"        # Red
npm test -- --watch --testNamePattern="[test]" # Green
npm run lint && npm test && npm run type-check # Commit
```

## When NOT to Use TDD

- Prototypes (throwaway)
- External API integration
- Simple one-off scripts
- UI experiments (visual first)
