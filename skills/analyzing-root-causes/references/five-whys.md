# 5 Whys - Analysis Process

## Overview

The 5 Whys technique repeatedly asks "Why?" to drill down to the root cause of a problem. The number 5 is a guideline—you may need fewer or more iterations.

## Process

### Step 1: Define the Problem

Start with a clear, specific problem statement.

❌ Vague: "The app is slow"
✅ Specific: "The dashboard takes 5 seconds to load"

### Step 2: Ask Why (Repeatedly)

| Level | Question | Answer Type |
| --- | --- | --- |
| Why 1 | Why does this problem occur? | Observable fact |
| Why 2 | Why does that happen? | Implementation detail |
| Why 3 | Why is that the case? | Design decision |
| Why 4 | Why does that exist? | Architectural constraint |
| Why 5 | Why was it designed this way? | Root cause |

### Step 3: Verify Root Cause

Ask: "If we fix this, will the problem be prevented?"

## Example Analysis

### Problem: Dashboard takes 5 seconds to load

**Why 1**: Why does the dashboard take 5 seconds?
→ The API call to `/api/dashboard` takes 4.5 seconds

**Why 2**: Why does the API call take so long?
→ It queries 15 tables to assemble the dashboard data

**Why 3**: Why does it query 15 tables?
→ The dashboard shows data from all modules in one view

**Why 4**: Why does it need all data at once?
→ The component renders everything on mount

**Why 5**: Why does it render everything on mount?
→ **Root cause: No lazy loading or progressive rendering**

**Solution**: Implement lazy loading for dashboard sections, fetch data on-demand

### Problem: Form submits twice

**Why 1**: Why does the form submit twice?
→ The submit button is clicked twice before the first request completes

**Why 2**: Why can it be clicked twice?
→ The button isn't disabled during submission

**Why 3**: Why isn't it disabled?
→ We're using `isSubmitting` state but it's set after the click handler starts

**Why 4**: Why is it set after?
→ We call `setIsSubmitting(true)` but React batches state updates

**Why 5**: Why does batching cause this?
→ **Root cause: Using state for an imperative concern (button disable)**

**Solution**: Either use `useRef` for immediate flag, or disable button with `disabled={pending}` from form action

## Template

```markdown
# Problem: [Clear, specific problem statement]

## Why 1: [Observable symptom]
Why does [problem] occur?
→ [Answer based on observable behavior]

## Why 2: [Implementation detail]
Why does [Why 1 answer] happen?
→ [Answer based on code/system behavior]

## Why 3: [Design decision]
Why is [Why 2 answer] the case?
→ [Answer based on architecture/design choices]

## Why 4: [Architectural constraint]
Why does [Why 3 answer] exist?
→ [Answer based on system constraints]

## Why 5: [Root cause]
Why was [Why 4 answer] designed this way?
→ [Root cause - the fundamental reason]

## Solution
[Fix that addresses the root cause, not just the symptom]

## Verification
- Does this fix prevent the problem from recurring?
- Is this simpler than patching the symptom?
- Does this introduce new problems?
```

## Tips

1. **Stay factual** - Base answers on evidence, not assumptions
2. **Don't stop early** - The first "why" is rarely the root cause
3. **Don't go too deep** - Stop when you reach something actionable
4. **Validate with "therefore"** - Read backwards: "Because [Why 5], therefore [Why 4]..."
5. **Multiple branches** - Sometimes there are multiple root causes

## Common Root Causes

| Category | Examples |
| --- | --- |
| Design | Wrong abstraction, missing pattern |
| Architecture | Coupling, missing boundary |
| Process | Missing validation, no retry logic |
| Knowledge | Misunderstanding of framework/library |
| Requirements | Unclear requirements led to wrong solution |
