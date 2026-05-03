# Review Checklist

## SOW/Spec Alignment

Run before per-file review.

### Step 1: Locate SOW/Spec

Search ${CLAUDE_SKILL_DIR}/../../workspace/planning/ for a directory whose name contains words from the branch name or PR title. Inside that directory look for `sow.md` and `spec.md`.

If no SOW/Spec found, fall back to PR description + commit messages as intent source and skip the AC/FR rows below.

### Step 2: Checks

| Check       | Source                              | Condition  | Flag as      |
| ----------- | ----------------------------------- | ---------- | ------------ |
| AC coverage | unchecked `- [ ]` items in `sow.md` | SOW found  | missing      |
| FR coverage | FR table rows in `spec.md`          | Spec found | missing      |
| Scope creep | diff vs all intent sources          | always     | out-of-scope |

### Output format

```
SOW/Spec Alignment: [CLEAN | MISSING <N> | OUT-OF-SCOPE <N> | BOTH]
Intent source: <sow.md + spec.md path | PR description | commit messages>
Missing (AC): AC-N - <description>
Missing (FR): FR-NNN - <description>
Out-of-scope: <file or area> - not traceable to stated intent
```

Skip silently if no intent source is available at all.

## Per-File Review

| Check        | What to Look For                                    |
| ------------ | --------------------------------------------------- |
| PR alignment | Changes serve the stated purpose                    |
| Code style   | Consistent with surrounding codebase                |
| Security     | Injection, XSS, auth bypass, secret exposure        |
| Side effects | Unintended behavior changes to existing features    |
| Performance  | Unnecessary API/DB calls, memory leaks, N+1 queries |
| Code smells  | Duplication, deep nesting, god functions            |

## Dependency Impact

| Check               | Method                                       |
| ------------------- | -------------------------------------------- |
| Import dependents   | ugrep for imports of changed files/exports   |
| Interface contracts | Verify unchanged function signatures         |
| Shared state        | Check global/module state mutations          |
| Test coverage       | Existing tests still valid for changed paths |

## Comment Sections

| Section         | Content                              |
| --------------- | ------------------------------------ |
| Requires action | `[must]`, `[want]` findings          |
| Awareness only  | `[imo]`, `[ask]`, `[nits]`, `[info]` |

## Test Assessment

### Before suggesting "add tests"

1. Check if the project has test infrastructure
2. Check if similar code has tests
3. Only suggest tests when the project convention expects them
