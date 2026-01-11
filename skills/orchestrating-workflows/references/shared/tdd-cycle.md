# TDD Cycle (RGRC) Reference

Red-Green-Refactor-Commit cycle for Test-Driven Development.

## Quick Reference

| Phase    | Goal                           | Confidence | Max Time |
| -------- | ------------------------------ | ---------- | -------- |
| Red      | Test fails for expected reason | 0.9        | 2 min    |
| Green    | Minimal code to pass           | 0.7        | 5 min    |
| Refactor | Clean without behavior change  | 0.95       | 3 min    |
| Commit   | All checks pass                | 1.0        | 1 min    |

## Baby Steps (2-Minute Cycle)

**"Make the smallest possible change at each step"** - t_wada

| Step | Time | Action                      |
| ---- | ---- | --------------------------- |
| 1    | 30s  | Write smallest failing test |
| 2    | 1min | Make it pass minimally      |
| 3    | 10s  | Run tests                   |
| 4    | 30s  | Tiny refactor (if needed)   |
| 5    | 20s  | Commit if green             |

**Why**: Bug is always in last 2-minute change. Always seconds from green.

## Phase Details

### Red Phase

1. Write/activate failing test
2. Run test → Verify failure
3. **Critical**: Failure reason must match intent

```bash
npm test -- --testNamePattern="[test]"
```

**Common mistake**: Test passes immediately → test doesn't check actual behavior.

### Green Phase

1. Write **minimal** code to pass
2. "You can sin" - quick/dirty OK
3. Only what test requires

```bash
npm test -- --watch --testNamePattern="[test]"
```

**Common mistake**: Over-implementing beyond test requirements.

### Refactor Phase

1. Clean code structure only
2. Keep tests green
3. Apply SOLID, DRY, Occam's Razor

**Common mistake**: Changing behavior (should only change structure).

### Commit Phase

1. Run all quality checks
2. Commit with meaningful message
3. Save stable state

```bash
npm run lint && npm test && npm run type-check
```

## Integration Points

| Command | TDD Usage                                        |
| ------- | ------------------------------------------------ |
| `/code` | Feature-driven with spec.md (Phase 0: skip mode) |
| `/fix`  | Bug-driven with regression tests (active mode)   |

## RGRC Checklist

Copy and track progress:

```markdown
TDD Cycle:

- [ ] Red - 失敗するテスト作成 (verify correct failure reason)
- [ ] Green - 最小限のコードで通過 (dirty OK)
- [ ] Refactor - コード改善 (keep tests green)
- [ ] Commit - 変更をコミット (all checks pass)
```

## When NOT to Use TDD

- Prototypes (throwaway code)
- External API integration (use mocks)
- Simple one-off scripts
- UI experiments (visual first)

## Related

- Completion criteria: [@../../../../rules/development/COMPLETION_CRITERIA.md](../../../../rules/development/COMPLETION_CRITERIA.md)
