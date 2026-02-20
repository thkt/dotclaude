# PRE_TASK_CHECK

## Markers

| Marker | Meaning  | Action                        |
| ------ | -------- | ----------------------------- |
| [✓]    | Verified | Proceed                       |
| [→]    | Inferred | Confirm before proceeding     |
| [?]    | Unknown  | Investigate before proceeding |

All items must be [✓] to proceed.

## Checklist (7 items)

| #   | Item          | Check Criteria                                           |
| --- | ------------- | -------------------------------------------------------- |
| 1   | Purpose       | Why needed + user's underlying intent (not just literal) |
| 2   | Scope         | Identified target files/functions                        |
| 3   | Constraints   | Technical requirements + limitations + dependencies      |
| 4   | Completion    | Done criteria + verification method + edge cases         |
| 5   | Context       | Check `.analysis/architecture.md` first, then read code  |
| 6   | Components    | Affected areas + potential risks                         |
| 7   | Prerequisites | Confirmed tech stack/conventions                         |

## Display Format

```text
[✓] Purpose: {description}
[✓] Scope: {target files/functions}
[✓] Constraints: {requirements}
[✓] Completion: {done criteria}
[✓] Context: {code understanding}
[✓] Components: {affected areas}
[✓] Prerequisites: {tech stack}

Status: Ready / Needs confirmation / Blocked
```

## Flow

1. Check 7 items → mark [✓]/[→]/[?]
2. Any non-[✓]? → Resolve first (ask/read)
3. All [✓]? → Show check → Confirm with user
4. Threshold exceeded? → Decompose
5. Execute

## Task Decomposition

Split when ANY threshold exceeded:

| Condition | Threshold |
| --------- | --------- |
| Files     | ≥5        |
| Features  | ≥3        |
| Layers    | ≥3        |
| Lines     | ≥200      |

## When to Skip

- Simple questions/confirmations or read-only queries
- Follow-up clarifications or sequential edits to same file(s)
- Continuation of approved plan (same session)
- User explicitly says "just do it" or "skip check"

## Done Definition

| Type          | Criteria                                                              |
| ------------- | --------------------------------------------------------------------- |
| Feature       | Functionality works, no regression, tests added                       |
| Fix           | Issue no longer reproduces, root cause resolved                       |
| Refactor      | Behavior unchanged (tests pass), quality improved (measurable)        |
| Investigation | Reproduction confirmed, root cause identified, normal case understood |

Add "No change required if [condition]" when existing state may be sufficient.

## "No Change" Rule

Before reporting no change: cite specific file:line, explain why current state meets goal, confirm with AskUserQuestion.
