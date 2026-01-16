# Bug-Driven TDD

How `/fix` command uses TDD for bug fixes.

## Context

| Aspect     | Value                                     |
| ---------- | ----------------------------------------- |
| Source     | Bug description and reproduction steps    |
| Approach   | Write failing test → Fix → Add edge cases |
| Test state | Active (not skipped)                      |
| Focus      | Regression prevention                     |

## Workflow

| Step | Action                                              |
| ---- | --------------------------------------------------- |
| 1    | Reproduce bug → Write failing test → Verify fails   |
| 2    | Fix bug → Minimal implementation → Test passes      |
| 3    | Prevent regression → Add edge case tests (optional) |
| 4    | Verify all tests passing                            |

## Key Characteristics

| Characteristic   | Description        |
| ---------------- | ------------------ |
| Reactive         | Bug → test → fix   |
| Bug-driven       | Reproduction first |
| Regression focus | Prevent recurrence |
| Fast iteration   | Minimal cycle time |

## Phase Breakdown

| Phase  | Action                                        |
| ------ | --------------------------------------------- |
| Red    | Write test reproducing exact bug, verify fail |
| Green  | Apply minimal fix, verify test passes         |
| Verify | Run full test suite, no regressions           |
| Edge   | Optional: add edge case tests                 |

## Decision Points

| Question                  | Criteria                                           |
| ------------------------- | -------------------------------------------------- |
| Skip regression test?     | Doc-only, CSS, config, trivial fix                 |
| Always write test for?    | Logic, security, data, bug fixes                   |
| Generate edge case tests? | Complex bug, critical logic, similar bugs possible |
| How minimal is minimal?   | Only what's necessary, no refactoring              |

## Common Pitfalls

| Pitfall                    | Fix                               |
| -------------------------- | --------------------------------- |
| Test after fixing          | Write failing test FIRST          |
| Test doesn't reproduce bug | Test exact failure scenario       |
| Over-engineering fix       | Simplest solution (Occam's Razor) |
| Not verifying test fails   | Always see Red before Green       |

## Feature-Driven vs Bug-Driven

| Aspect     | Bug-Driven            | Feature-Driven              |
| ---------- | --------------------- | --------------------------- |
| Trigger    | Bug report            | Specification               |
| Test state | Active                | Skip state initially        |
| Test count | 1 main + edge cases   | All tests generated upfront |
| Activation | Immediate             | User-controlled             |
| Focus      | Regression prevention | Feature completion          |
