# Steps 9-10: Spec Review and Task Decomposition

## Step 9: Spec Review

After Spec generation, invoke `reviewer-spec`.

Gate = Ready → pass. Gate = NotReady → fix P0 blockers, re-invoke (max 3 loops). After 3 loops, present remaining blockers to user and proceed.

## Step 10: Task Decomposition

### Principles

| Principle                     | Rule                                                      |
| ----------------------------- | --------------------------------------------------------- |
| Outcome-anchored phases       | 1 AC = 1 Phase. Each Phase delivers one acceptance signal |
| Completion criteria required  | Each Phase states what observable signal marks it done    |
| Parallel grouping             | Never 1 task per phase if parallelizable                  |
| First move explicit           | State which task to start and why                         |
| Scope cut = leaf only         | Core dependency tasks are non-negotiable                  |
| No urgency panic              | Analyze structurally, not reactively                      |

### TaskCreate

Cross-session: `export CLAUDE_CODE_TASK_LIST_ID="[feature]-tasks"` (max 10 tasks)

| Source              | subject                          | description              | addBlockedBy     |
| ------------------- | -------------------------------- | ------------------------ | ---------------- |
| Implementation Plan | `Phase N (AC-M): [description]`  | Steps + validates AC-M   | [dependency IDs] |
| Test Plan (HIGH)    | `Test: [description]`            | (if complex)             | [dependency IDs] |

### Scope Validation

<!-- canonical: rules/core/PREFLIGHT.md (decomposition thresholds) -->

Each Phase delivers one AC. After mapping ACs to Phases, count unique files per Phase. Split any Phase with Files ≥ 5 into independent Units (each gets own SOW/Spec). This keeps cognitive load tractable. Repeat until all Phases have Files < 5.

Splitting here means re-decomposing the AC into smaller outcome units (each with its own observable signal), not slicing the implementation. Confirm the new ACs with the user. This is a contract change, not just internal restructuring.

### Milestone Summary

```text
Phase 1 (AC-N): task list (completion criteria: observable signal)
Phase 2 (AC-M): ...
```

### First Move

```text
→ Task N: [rationale: why this unblocks the most downstream work]
```

### Scope Cut Candidates

Leaf tasks only. Core dependencies are non-negotiable.
