# Testing

Covers coverage perspectives, priority areas, test naming, and the delta-based gate.

## Coverage as Supplementary Indicator

Coverage measures whether code executed, not whether it was correctly verified. Do not target a number. Target perspectives and priority areas.

| Level | Name               | Criterion                                               |
| ----- | ------------------ | ------------------------------------------------------- |
| C0    | Statement coverage | Each line executed at least once                        |
| C1    | Branch coverage    | Both sides of every if / switch hit                     |
| C2    | Condition coverage | Each operand of every compound condition true and false |

## Priority Areas

Do not chase uniform coverage. Cover impact-heavy areas deeper. Depth is the Level to reach for the area. Areas where failure leads directly to monetary loss, unauthorized access, or data loss are C2. Even in C1 areas, raise any spot with a compound condition (&& / || / ternary) to C2.

| Area                      | Examples                              | Depth |
| ------------------------- | ------------------------------------- | ----- |
| Core business rules       | Calculation, decision, transformation | C2    |
| Authorization             | Role check, permission                | C2    |
| Billing / payment         | Amount calculation, rate decision     | C2    |
| Data integrity            | Transaction, unique constraint        | C1    |
| State transition          | State machine                         | C1    |
| User-facing flows         | Booking, checkout                     | C1    |
| Presentational components | Props rendering                       | C0    |
| Thin wrappers             | Pure delegation                       | C0    |

## Test Authoring Sequence

Start from perspectives, and use coverage only to detect gaps.

| Step | Action                                                                                        |
| ---- | --------------------------------------------------------------------------------------------- |
| 1    | Read the spec of the code under test and list the conditions it must satisfy                  |
| 2    | Pick the perspectives matching the signature and domain from the Perspective Checklist        |
| 3    | Write tests that satisfy the conditions (Step 1) and perspectives (Step 2)                    |
| 4    | Run coverage; for any uncovered branch / condition, add a test using the matching perspective |

### Perspective Checklist

| Perspective    | What to check                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Equivalence    | Group inputs that behave the same and test one representative per group                                           |
| Boundary       | Both sides of every boundary (min - 1 and min, max and max + 1). Add zero and empty as special values             |
| Branch (C1)    | Every path of every if / switch                                                                                   |
| Condition (C2) | Each operand of every compound condition, true and false                                                          |
| Combination    | When 2+ independent conditions interact, write a decision table and cover each row                                |
| State          | Legal transitions pass, prohibited transitions are rejected                                                       |
| Error          | Feed invalid input / null and exercise exception paths                                                            |
| Hazard         | Incidents the product can realistically hit, such as double-submit / timezone / permission bypass / partial state |
| Concurrency    | Race / ordering. Apply only when the target is async / multi-threaded                                             |

## Test Naming

Test names state the spec they verify (e.g. "rejects deposit when amount is negative").

## Coverage Gate

Do not let C0 / C1 drop in a PR. The gate is delta-only with no absolute floor, avoiding number targeting. Define absolute thresholds in the project's spec NFR when needed (e.g. security tools may keep C0 ≥90%). Exceptions are auto-generated code, data definitions, test files, and legacy in migration.
