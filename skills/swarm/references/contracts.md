# Swarm Reference

Details and templates referenced by SKILL.md during execution.

## Context Contracts

Each handoff has a defined structure. Peer DM is the transport; these contracts define what to send.

### Spawn Context (Leader → all agents)

Every spawn prompt includes the following.

- CLAUDE.md rules (or summary of key constraints)
- Project conventions (tech stack, naming, patterns)
- SOW/spec content (if available)

### Architect Output (Architect → Leader)

```markdown
### Contracts

| Name                | Definition                   | Used By    |
| ------------------- | ---------------------------- | ---------- |
| interface/type name | TypeScript interface or type | file paths |

### Shared Changes

| File      | Change                | Apply           |
| --------- | --------------------- | --------------- |
| file path | description of change | before parallel |

### Parallel Units

| Unit ID | Files      | Depends On                                             |
| ------- | ---------- | ------------------------------------------------------ |
| 1       | file paths | (none), GOAL keep empty (independence-first)           |
| 2       | file paths | (none), populate only when unavoidable, with rationale |

Build sequence: unit_id order if dependencies exist
```

### Implementer Started (Implementer → Leader)

```markdown
| Field   | Value      |
| ------- | ---------- |
| unit_id | 1          |
| status  | started    |
| files   | file count |
```

### Implementer Assignment (Leader → Implementer)

```markdown
| Field       | Value                                 |
| ----------- | ------------------------------------- |
| unit_id     | 1                                     |
| contracts   | relevant contracts only               |
| files       | assigned file paths                   |
| tests       | assigned test file paths              |
| constraints | project-specific rules from CLAUDE.md |
```

### Implementer Completion (Implementer → Leader)

```markdown
## Status

| Field   | Value              |
| ------- | ------------------ |
| unit_id | 1                  |
| status  | complete / blocked |

### Files Modified

| Path      | Action             |
| --------- | ------------------ |
| file path | created / modified |

### Tests

| Metric | Value |
| ------ | ----- |
| total  | count |
| passed | count |
| failed | count |

### Issues

- description (severity: blocker / warning)
```

Leader response by status and issues.

| Status   | Issues     | Leader Action                                     |
| -------- | ---------- | ------------------------------------------------- |
| complete | none       | Proceed to merge                                  |
| complete | warning(s) | Forward warnings to Architect for assessment      |
| blocked  | blocker(s) | Assess: context gap → re-dispatch with more info  |
|          |            | Assess: too complex → upgrade model or split task |
|          |            | Assess: plan wrong → escalate to user             |

## Progress Tracking

Leader maintains a progress table and reports to user at key events.

### Display Format

```markdown
## Swarm Progress

| Unit | Files | Implementer | Status      | Duration |
| ---- | ----- | ----------- | ----------- | -------- |
| 1    | 3     | impl-1      | complete    | 2m 30s   |
| 2    | 2     | impl-2      | in_progress | 1m 45s   |
| 3    | 4     | impl-3      | in_progress | 1m 45s   |

Shared changes: applied Integration: pending (2/3 units complete)
```

### Trigger Events

| Event                   | Action                           |
| ----------------------- | -------------------------------- |
| Phase 4 start           | Show initial table (all pending) |
| Implementer started DM  | Update row status to in_progress |
| Implementer completion  | Update row, show progress        |
| All Implementers done   | Show timeline summary            |
| Phase 6a merge progress | Show merge status per unit       |
| Phase 6b QG result      | Show pass/fail with details      |

## Abort / Rollback

| Scenario               | Recovery                                                            |
| ---------------------- | ------------------------------------------------------------------- |
| Mid-Phase 1 abort      | Shutdown Architect + QA, TeamDelete                                 |
| Mid-Phase 3/4 abort    | Shutdown test-gen + QA, TeamDelete                                  |
| Mid-Phase 5 abort      | Shutdown all Implementers + QA, TeamDelete                          |
| Mid-Phase 6 abort      | Tag main before merges; revert merged commits if needed, TeamDelete |
| Partial implementation | Implementer worktrees contain changes, user decides to keep/discard |
