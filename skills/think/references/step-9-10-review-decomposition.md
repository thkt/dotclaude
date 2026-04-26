# Steps 9-10: Spec Review and Task Decomposition

## Step 9: Spec Review

After Spec generation, invoke `reviewer-spec`.

Gate = Ready → pass. Gate = NotReady → fix P0 blockers, re-invoke (max 3 loops).
After 3 loops, present remaining blockers to user and proceed.

## Step 10: Task Decomposition

### Principles

| Principle              | Rule                                            |
| ---------------------- | ----------------------------------------------- |
| Sub-deadlines required | Phase-level milestones with completion criteria |
| Parallel grouping      | Never 1 task per phase if parallelizable        |
| First move explicit    | State which task to start and why               |
| Scope cut = leaf only  | Core dependency tasks are non-negotiable        |
| No urgency panic       | Analyze structurally, not reactively            |

### TaskCreate

Cross-session: `export CLAUDE_CODE_TASK_LIST_ID="[feature]-tasks"` (max 10 tasks)

| Source              | subject                  | description              | addBlockedBy     |
| ------------------- | ------------------------ | ------------------------ | ---------------- |
| Implementation Plan | `Phase N: [description]` | Steps + validates AC-XXX | [dependency IDs] |
| Test Plan (HIGH)    | `Test: [description]`    | (if complex)             | [dependency IDs] |

### Scope Validation

Before creating tasks, count unique files per Phase in the Implementation Plan.
Split any Phase with Files ≥ 5 into independent Units (each gets own SOW/Spec).
Repeat until all Phases have Files < 5.

### Milestone Summary

```text
Phase 1 [Day X]: task list (completion criteria)
Phase 2 [Day Y]: ...
```

### First Move

```text
→ Task N: [rationale — why this unblocks the most downstream work]
```

### Scope Cut Candidates

Leaf tasks only. Core dependencies are non-negotiable.
