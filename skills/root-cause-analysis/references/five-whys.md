# 5 Whys - Worked Examples

A good problem statement is specific and observable. "The dashboard takes 5 seconds to load" is analyzable; "the app is slow" is not.

## Example: Dashboard takes 5 seconds to load

| Step | Question         | Answer                                  |
| ---- | ---------------- | --------------------------------------- |
| 1    | Why 5 seconds?   | API `/api/dashboard` takes 4.5s         |
| 2    | Why slow API?    | Queries 15 tables                       |
| 3    | Why 15 tables?   | Shows all modules in one view           |
| 4    | Why all at once? | Renders everything on mount             |
| 5    | Why on mount?    | No lazy loading                         |

Solution: Lazy loading for sections, fetch on-demand.

## Example: Form submits twice

| Step | Question          | Answer                                  |
| ---- | ----------------- | --------------------------------------- |
| 1    | Why twice?        | Clicked twice before request completes  |
| 2    | Why clickable?    | Button not disabled during submission   |
| 3    | Why not disabled? | `isSubmitting` set after handler starts |
| 4    | Why after?        | React batches state updates             |
| 5    | Why batching?     | State used for imperative concern       |

Solution: `useRef` for immediate flag, or `disabled={pending}` from form action.
