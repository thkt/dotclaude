# 5 Whys - Analysis Process

## Problem Definition

| Quality | Example                                 |
| ------- | --------------------------------------- |
| Bad     | "The app is slow"                       |
| Good    | "The dashboard takes 5 seconds to load" |

## Examples

### Dashboard takes 5 seconds to load

| Step | Question         | Answer                          | Level          |
| ---- | ---------------- | ------------------------------- | -------------- |
| 1    | Why 5 seconds?   | API `/api/dashboard` takes 4.5s | Observable     |
| 2    | Why slow API?    | Queries 15 tables               | Implementation |
| 3    | Why 15 tables?   | Shows all modules in one view   | Design         |
| 4    | Why all at once? | Renders everything on mount     | Architecture   |
| 5    | Why on mount?    | **No lazy loading**             | Root cause     |

**Solution**: Lazy loading for sections, fetch on-demand

### Form submits twice

| Step | Question          | Answer                                  | Level          |
| ---- | ----------------- | --------------------------------------- | -------------- |
| 1    | Why twice?        | Clicked twice before request completes  | Observable     |
| 2    | Why clickable?    | Button not disabled during submission   | Implementation |
| 3    | Why not disabled? | `isSubmitting` set after handler starts | Design         |
| 4    | Why after?        | React batches state updates             | Architecture   |
| 5    | Why batching?     | **State for imperative concern**        | Root cause     |

**Solution**: `useRef` for immediate flag, or `disabled={pending}` from form action

## Tips

| Tip              | Description                      |
| ---------------- | -------------------------------- |
| Stay factual     | Evidence, not assumptions        |
| Don't stop early | First "why" is rarely root cause |
| Don't go deep    | Stop when actionable             |
| Validate         | "Because [5], therefore [4]..."  |
| Verify fix       | "Will this prevent the problem?" |

## Common Root Causes

| Category     | Examples                              |
| ------------ | ------------------------------------- |
| Design       | Wrong abstraction, missing pattern    |
| Architecture | Coupling, missing boundary            |
| Process      | Missing validation, no retry logic    |
| Knowledge    | Misunderstanding of framework/lib     |
| Requirements | Unclear requirements → wrong solution |
