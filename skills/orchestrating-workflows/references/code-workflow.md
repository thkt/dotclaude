# /code Workflow

## Flow

```text
Phase 0: SOW Context + Test Generation
Phase 1-N: RGRC (one test at a time)
  Red → Green (Ralph-loop) → Refactor → Commit
Completion: Quality Gates → IDR
```

## Phase 0: SOW Context + Test Generation

### SOW/Spec Auto-detection

[@../../lib/sow-resolution.md]

### Test Generation

Prerequisites: spec.md with FR-xxx items.

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

Run lint, type-check, test using project's package manager (detect from lockfile). Independent commands in parallel.

## Confidence-Based Decisions

| Confidence | Action               |
| ---------- | -------------------- |
| ≥80%       | Proceed              |
| 50-79%     | Add defensive checks |
| <50%       | → /research first    |

## IDR Generation

After completion:

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

> [!NOTE]
> - {what changed — bullet list}

> [!TIP]
> - **{decision}**: {why this decision was made}

---

### git diff --stat
```
 {file} | {count} {++++----}
 N files changed, M insertions(+), D deletions(-)
```
````

Rules:

- File links: `file:///` + absolute path (VS Code clickable)
- Diff: include `@@` hunk headers for line numbers
- Per-file order: link heading → diff → `[!NOTE]` What Changed → `[!TIP]` Design Rationale
- Output: `$IDR_DIR/idr-{NN}.md` (auto-numbered), `$IDR_DIR` = `.claude/workspace/planning/YYYY-MM-DD-[feature]/`
- Language: follows `settings.json` `language`
