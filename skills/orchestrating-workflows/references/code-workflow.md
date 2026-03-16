# /code Workflow

## Flow

```text
Phase 0: SOW Context + Test Generation
Phase 1-N: RGRC (one test at a time)
  Red → Green (Ralph-loop) → Refactor → Commit
Review: code-quality-reviewer (skip for /fix)
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

| Step     | Action                                            |
| -------- | ------------------------------------------------- |
| Red      | Remove `.skip`, verify correct failure            |
| Green    | Implement minimal (gates auto-retry on Stop hook) |
| Refactor | Apply SOLID, DRY, Occam                           |
| Commit   | All checks pass                                   |

## Review Gate

After all RGRC cycles, spawn `code-quality-reviewer` to catch structural and
readability issues missed during implementation.

```
Agent(subagent_type: "code-quality-reviewer",
      prompt: "Review files changed in this session: <changed file paths>",
      run_in_background: true)
```

| Result           | Action                             |
| ---------------- | ---------------------------------- |
| 0 high findings  | Pass → proceed to Quality Gates    |
| ≥1 high findings | Fix issues → re-run affected tests |
| medium/low only  | Pass (note in IDR)                 |
| timeout          | Skip (note in IDR)                 |

Skip when: `/fix`, single-file changes, no Spec context.

## Quality Gates

Run lint, type-check, test using project's package manager (detect from
lockfile). Independent commands in parallel.

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
>
> - {what changed — bullet list}

> [!TIP]
>
> - **{decision}**: {why this decision was made}
> - **Not adopted**: {rejected alternative} — {why rejected}

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
- Per-file order: link heading → diff → `[!NOTE]` What Changed → `[!TIP]` Design
  Rationale (include rejected alternatives when they existed)
- Output: `$IDR_DIR/idr-{NN}.md` (auto-numbered), `$IDR_DIR` =
  `.claude/workspace/planning/YYYY-MM-DD-[feature]/`
- Language: follows `settings.json` `language`
