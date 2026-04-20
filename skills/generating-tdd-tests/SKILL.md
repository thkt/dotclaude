---
name: generating-tdd-tests
description: >
  TDD with RGRC cycle and Baby Steps. Use when: TDD, テスト駆動,
  Red-Green-Refactor, Baby Steps.
allowed-tools: [Read, Write, Edit, Grep, Glob, Task]
context: fork
user-invocable: false
---

# TDD Test Generation

Test behavior, not implementation. Assert on what the code does (observable
output, return values, side effects), not how it does it (internal calls,
private state, execution order).

A test that fails for the wrong reason (syntax error, wrong import) is not a
valid Red. Fix the test first, then verify the failure matches the intended
behavior gap.

## Test Philosophy

Default: Classical (Detroit) style. Use real objects. Mock only at system
boundaries.

| Principle | Rule |
| --- | --- |
| Behavior over implementation | Test public API output, not internal calls |
| State verification preferred | Assert on result values, not "was X called" |
| Real objects first | Use real dependencies. Mock only external I/O |
| Black-box perspective | Treat the unit as a black box via its public interface |
| Sociable tests | Let collaborators participate. Isolate only at boundaries |

When to use mocks (London style exceptions):

- External APIs, databases, file system, network
- Non-deterministic dependencies (time, random)
- Slow dependencies that block the 2-min cycle

## RGRC Cycle

| Phase    | Goal         | Rule                     |
| -------- | ------------ | ------------------------ |
| Red      | Failing test | Verify failure reason    |
| Green    | Pass test    | "You can sin" - dirty OK |
| Refactor | Clean code   | Keep tests green         |
| Commit   | Save state   | All checks pass          |

## Baby Steps (2-min cycle)

30s: Write failing test → 1min: Make pass → 10s: Run tests → 30s: Tiny refactor
→ 20s: Commit if green

## Test Design

| Technique                | Use For               | Example                |
| ------------------------ | --------------------- | ---------------------- |
| Equivalence Partitioning | Group same behavior   | Age: <18, 18-120       |
| Boundary Value           | Test edges            | 17, 18, 120, 121       |
| Decision Table           | Multi-condition logic | isLoggedIn × isPremium |

## Assertion Quality

Every test must verify a specific outcome. Weak assertions alone are forbidden.

| Category | Matchers | When acceptable |
| --- | --- | --- |
| Weak (existence) | toBeTruthy, toBeDefined, toBeFalsy, toBeNull, toBeUndefined | Only with a meaningful assertion in the same test |
| Meaningful (value) | toBe, toEqual, toStrictEqual, toMatch, toContain, toThrow, toHaveLength | Always preferred |
| Meaningful (call) | toHaveBeenCalledWith, toHaveBeenCalledTimes, toHaveReturnedWith | When verifying side effects |

Bad: `expect(result).toBeTruthy()`
Good: `expect(result).toEqual({ id: 1, name: "Alice" })`

One test, one concept. If two tests assert the same function with the same
argument pattern, merge or parameterize with `test.each`.

## Mock Rules

| Rule | Threshold |
| --- | --- |
| Mock count per test | Must not exceed assertion count |
| Mock scope | External dependencies only (API, DB, file system) |
| Mock target | Never mock the module under test |

## Mock Pitfalls

| Anti-Pattern                | Problem                                     | Instead                                    |
| --------------------------- | ------------------------------------------- | ------------------------------------------ |
| Assert mock was called      | Tests mock behavior, not component behavior | Assert on observable output or side effect |
| Test-only production method | Pollutes production API for test access     | Extract to test utility or use public API  |
| Mock before understanding   | Hides real dependency behavior              | Understand dependency first, then mock     |
| Partial mock structure      | Missing fields cause false passes           | Mirror complete real API structure         |
| Mock overuse                | More mocks than assertions = testing wiring | Reduce mocks or add meaningful assertions  |

## Coverage

See `rules/development/THRESHOLDS.md` for canonical values.

## Naming

| Level | Pattern                                          |
| ----- | ------------------------------------------------ |
| Suite | `describe("[Target]", ...)`                      |
| Group | `describe("[Method]", ...)`                      |
| Test  | `it("when [condition], should [expected]", ...)` |

## Framework Detection

| Condition          | Framework |
| ------------------ | --------- |
| `vitest` in deps   | Vitest    |
| `jest` in deps     | Jest      |
| `bun` as runtime   | Bun test  |
| No framework found | Vitest    |

## References

| Topic          | File                                                      |
| -------------- | --------------------------------------------------------- |
| Feature-driven | `${CLAUDE_SKILL_DIR}/references/feature-driven.md`        |
| Bug-driven     | `${CLAUDE_SKILL_DIR}/references/bug-driven.md`            |
| Flaky tests    | `${CLAUDE_SKILL_DIR}/references/flaky-test-management.md` |
