# /code Workflow

## Flow

```text
Phase 0: Spec → Skipped Tests
Phase 1-N: RGRC (one test at a time)
  Red → Green (Ralph-loop) → Refactor → Commit
Completion: Quality Gates → IDR
```

## Phase 0: Test Generation

1. Auto-detect `spec.md` in workspace
2. Parse FR-xxx requirements
3. Generate ALL tests in **skip state**
4. Order: simple → complex (Baby Steps)

## Phase 1-N: RGRC Cycle

For each test:

| Step     | Action                                    |
| -------- | ----------------------------------------- |
| Red      | Remove `.skip`, verify correct failure    |
| Green    | Implement minimal (Ralph-loop auto-retry) |
| Refactor | Apply SOLID, DRY, Occam                   |
| Commit   | All checks pass                           |

## Quality Gates

| Check    | Target           | Required    |
| -------- | ---------------- | ----------- |
| Tests    | All pass         | ✓           |
| Lint     | 0 errors         | ✓           |
| Types    | No errors        | ✓           |
| Coverage | C0 ≥90%, C1 ≥80% | Recommended |

```bash
npm run lint & npm run type-check & npm test & wait
```

## Confidence-Based Decisions

| Confidence | Action               |
| ---------- | -------------------- |
| ≥80%       | Proceed              |
| 50-79%     | Add defensive checks |
| <50%       | → /research first    |

## IDR Generation

After completion, generate IDR with changed files and key decisions.
