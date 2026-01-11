---
description: Orchestrate complete development cycle from research to validation
allowed-tools: SlashCommand, TodoWrite, Read, Write, Edit, MultiEdit
model: inherit
argument-hint: "[feature or task description]"
dependencies: [orchestrating-workflows]
---

# /full-cycle - Complete Development Cycle

Orchestrate the complete development cycle through SlashCommand integration.

## Workflow

```text
/research → /think → Design Review → /code → /test → /audit → /validate
    ↓          ↓          ↓            ↓        ↓         ↓         ↓
  Explore    SOW/Spec   90+ score   RGRC    All pass   Review   Criteria
```

## Phases

| Phase | Command   | Purpose                   | On Failure      |
| ----- | --------- | ------------------------- | --------------- |
| 1     | /research | Explore codebase          | Ask user        |
| 2     | /think    | Create SOW/Spec           | Retry or ask    |
| 2.5   | Agent     | sow-spec-reviewer (≥90)   | Fix docs        |
| 3     | /code     | TDD implementation        | /fix → retry    |
| 4     | /test     | Run all tests             | /fix → retry    |
| 5     | /audit    | Code review               | Document issues |
| 6     | /validate | Check acceptance criteria | Report failures |

## Design Review (Phase 2.5)

```typescript
Task({
  subagent_type: "sow-spec-reviewer",
  prompt: "100-point scoring, 90-point pass threshold",
});
```

| Score | Action                    |
| ----- | ------------------------- |
| ≥90   | Proceed to implementation |
| 70-89 | Fix issues, re-review     |
| <70   | Return to /think          |

## Progress Tracking

Use TodoWrite throughout:

```markdown
- [ ] Research phase
- [ ] Planning phase
- [ ] Design review
- [ ] Implementation
- [ ] Testing
- [ ] Review
- [ ] Validation
```

## Usage

```bash
/full-cycle "Add user authentication"
/full-cycle --skip=research,think
/full-cycle --start-from=code
```

## Example

```text
/full-cycle "Add OAuth2 authentication"

[ok] Research complete - found auth patterns
[ok] SOW created (8 acceptance criteria)
Design Review: 92/100 PASS
[ok] Implementation - 15 files modified
[warn] 3 tests failed -> /fix -> [ok] All passing
[ok] Review complete
[ok] All criteria met

Complete!
```
