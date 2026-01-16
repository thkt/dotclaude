---
name: analyzing-root-causes
description: Root cause analysis with 5 Whys methodology.
allowed-tools: [Read, Grep, Glob, Task]
context: fork
user-invocable: false
---

# Root Cause Analysis - 5 Whys

## Symptom vs Root Cause

| Type        | Example                    | Result        |
| ----------- | -------------------------- | ------------- |
| Symptom Fix | setTimeout to wait for DOM | Breaks later  |
| Root Cause  | Use React ref properly     | Permanent fix |
| Symptom Fix | Add flag for double-submit | Complexity ↑  |
| Root Cause  | Disable button on submit   | Simple fix    |

## 5 Whys Process

| Step | Question                      | Reveals                  |
| ---- | ----------------------------- | ------------------------ |
| 1    | Why does this occur?          | Observable fact          |
| 2    | Why does that happen?         | Implementation detail    |
| 3    | Why is that the case?         | Design decision          |
| 4    | Why does that exist?          | Architectural constraint |
| 5    | Why was it designed this way? | Root cause               |

## References

| Topic    | File                             |
| -------- | -------------------------------- |
| 5 Whys   | `references/five-whys.md`        |
| Patterns | `references/symptom-patterns.md` |
