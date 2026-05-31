# Testing

Coverage thresholds live in `THRESHOLDS.md` (delta-based gate). This file covers perspectives and quality.

## Coverage as Supplementary Indicator

Coverage measures whether code executed, not whether it was correctly verified. Do not target a number. Target perspectives and priority areas.

| Level | Perspective                                           |
| ----- | ----------------------------------------------------- |
| C0    | Statement coverage: each line executed at least once  |
| C1    | Branch coverage: both sides of every if / switch hit  |
| C2    | Condition coverage: each sub-condition true and false |

## Priority Areas

Do not chase uniform coverage. Cover impact-heavy areas deeper. Use `Required depth` to decide which Level applies.

| Area                      | Examples                              | Required depth                                     |
| ------------------------- | ------------------------------------- | -------------------------------------------------- |
| Core business rules       | Calculation, decision, transformation | Up to C2                                           |
| Authorization             | Role check, permission                | Up to C2                                           |
| Billing / payment         | Amount calculation, rate decision     | Up to C2                                           |
| Data integrity            | Transaction, unique constraint        | Up to C1; C2 if condition uses && / \|\| / ternary |
| State transition          | State machine                         | Up to C1; C2 if condition uses && / \|\| / ternary |
| User-facing flows         | Booking, checkout                     | Up to C1; C2 if condition uses && / \|\| / ternary |
| Presentational components | Props rendering                       | C0                                                 |
| Thin wrappers             | Pure delegation                       | C0                                                 |

Classify as core when failure causes direct user impact: monetary loss, unauthorized access, or data loss.

## Anti-patterns

### AI-Generated Test Bias

When generating tests via AI, expect these biases. Run this checklist on the output and re-prompt for each miss.

| Bias                        | Re-prompt with                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Happy-path only             | Add tests for invalid input, null, and exception paths                                    |
| Conventional cases          | List edge cases for each input parameter and add a test per edge case                     |
| C0 satisfied, C1 weak       | Add a test for the false branch of every if / switch                                      |
| C1 satisfied, C2 missing    | For each compound condition, test each operand true and false independently               |
| Conditions not combined     | Build a decision table for compound conditions and add a test per row                     |
| Illegal transitions ignored | Add tests asserting that prohibited state transitions are rejected                        |
| No product-specific hazards | List Hazard patterns (double-submit, timezone, perm bypass, partial state) and add a test |
| Weak assertions             | Replace toBeTruthy with exact value comparison                                            |
| Vague test intent           | Rename each test to state the spec it verifies                                            |
| Restates implementation     | Drop tests that only restate impl (tautology, asserting a mock was called); test observable behavior via the public API instead |

`litmus` (oxc_parser based static analysis) automates these bias checks across a test suite without manual review. Run it as a CI gate where the harness is wired.

### Number-as-Goal Trap

Chasing a coverage number produces:

- Tests that execute code without meaningful assertions
- Padding with C0-only tests to clear the gate
- Tests coupled to implementation details, fragile to refactoring
- Increased maintenance cost without quality gain
- False confidence that hides actual risk

`THRESHOLDS.md` uses a delta-based gate to avoid this trap.

## Test Authoring Sequence

Do not start from coverage. Start from perspectives. Use coverage only to detect gaps.

| Step | Action                                                                                        |
| ---- | --------------------------------------------------------------------------------------------- |
| 1    | Read the spec for the function or feature; restate what must hold true                        |
| 2    | List perspectives from the checklist below that apply to the function's signature and domain  |
| 3    | Generate tests by passing Step 1 (spec) and Step 2 (perspectives) as context to the AI        |
| 4    | Run coverage; for any uncovered branch / condition, add a test using the matching perspective |

### Perspective Checklist

| Perspective | What to check                                                                            |
| ----------- | ---------------------------------------------------------------------------------------- |
| Equivalence | Group inputs by behavior class. One representative per class                             |
| Boundary    | min, min - 1, max, max + 1, zero, empty                                                  |
| Branch      | Every path of every if / switch                                                          |
| Condition   | Each operand of every compound condition: true and false                                 |
| Combination | For 2+ conditions, list decision table first. Cover each row                             |
| State       | Every transition. Both legal and prohibited transitions                                  |
| Error       | Invalid input, null, exception path                                                      |
| Hazard      | Product-specific incident patterns (double-submit, timezone, perm bypass, partial state) |
| Concurrency | Race, ordering (async or multi-threaded only)                                            |

## Quality Checklist

Run before merging. Quality precedes quantity.

| Item       | Reject                 | Accept                                                              |
| ---------- | ---------------------- | ------------------------------------------------------------------- |
| Assertion  | toBeTruthy alone       | Exact value comparison                                              |
| Boundary   | Mid-range only         | Both sides of every boundary (see Perspective Checklist)            |
| Error      | Happy path only        | Invalid input and exception path covered                            |
| Branch     | One side               | Both sides                                                          |
| Condition  | Result only            | Each operand: true and false                                        |
| Test name  | "test1", "should work" | Restates the spec (e.g., "rejects deposit when amount is negative") |
