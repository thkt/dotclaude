---
name: analyzing-root-causes
description: Root cause analysis with 5 Whys methodology.
allowed-tools: [Read, Grep, Glob, Task]
context: fork
user-invocable: false
---

# Root Cause Analysis - 5 Whys

Solve problems by addressing root causes, not symptoms.

## Symptom vs Root Cause

| Type        | Example                      | Result           |
| ----------- | ---------------------------- | ---------------- |
| Symptom Fix | setTimeout to wait for DOM   | Breaks later     |
| Root Cause  | Use React ref properly       | Permanent fix    |
| Symptom Fix | Add flag for double-submit   | Complexity grows |
| Root Cause  | Disable button during submit | Simple, reliable |

## Section-Based Loading

| Section  | File                             | Focus                |
| -------- | -------------------------------- | -------------------- |
| 5 Whys   | `references/five-whys.md`        | Analysis process     |
| Patterns | `references/symptom-patterns.md` | Common symptom→cause |

## Quick Checklist

- [ ] Is this fixing symptom or cause?
- [ ] What would prevent this entirely?
- [ ] Can simpler technology solve this?
- [ ] Will this fix add complexity?

## 5 Whys Process

1. **Why** does this occur? → Observable fact
2. **Why** does that happen? → Implementation detail
3. **Why** is that the case? → Design decision
4. **Why** does that exist? → Architectural constraint
5. **Why** was it designed this way? → Root cause

## Key Principles

| Principle             | Application                   |
| --------------------- | ----------------------------- |
| Prevention > Patching | Best fix prevents the problem |
| Simple > Complex      | Root cause fixes are simpler  |
| Ask Why               | Don't accept first answer     |
