# /code Workflow

## Flow

```text
Phase 0: Spec → Skipped Tests
Phase 1-N: RGRC (one test at a time)
  Red → Green (Ralph-loop) → Refactor → Commit
Completion: Quality Gates → IDR
```

## Phase 0: SOW Context + Test Generation

### SOW/Spec Auto-detection

1. `Glob(".claude/workspace/planning/*/sow.md")` → find latest SOW
2. If found → read SOW (Acceptance Criteria, Constraints) + `spec.md` (FR-xxx, Implementation Plan)
3. SOW/spec become the authoritative instruction source for all subsequent phases
4. If `$1` conflicts with SOW → SOW wins, flag to user

### Test Generation

Prerequisites: spec.md with FR-xxx (Functional Requirement) items.

1. Parse FR-xxx requirements from spec
2. Generate ALL tests in **skip state**
3. Order: simple → complex (Baby Steps)

## Phase 1-N: RGRC Cycle

For each test:

| Step     | Action                                              |
| -------- | --------------------------------------------------- |
| Red      | Remove `.skip`, verify correct failure              |
| Green    | Implement minimal (Ralph-loop auto-retry, optional) |
| Refactor | Apply SOLID, DRY, Occam                             |
| Commit   | All checks pass                                     |

## Quality Gates

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

After completion, generate IDR following this format:

````markdown
# IDR: {summary title}

> {YYYY-MM-DD}

## Summary

{2-3 sentences summarizing changes and purpose}

## Changes

### [{file path}](file:///{absolute path})

```diff
@@ -{old_start},{old_count} +{new_start},{new_count} @@
-removed line
+added line
```

> [!WHAT]
> - {what changed — bullet list}

> [!RATIONALE]
> - **{decision}**: {why this decision was made}

---

### git diff --stat
```
 {file} | {count} {++++----}
 N files changed, M insertions(+), D deletions(-)
```
````

Rules:

- File links: `file:///` + absolute path (clickable in VS Code)
- Diff: include `@@` hunk headers for line numbers
- Order per file: link heading → diff → `[!NOTE]` What Changed → `[!TIP]` Design Rationale
- Output path: `$IDR_DIR/idr-{NN}.md` (auto-numbered)
- Output language: follows `settings.json` `language` setting
