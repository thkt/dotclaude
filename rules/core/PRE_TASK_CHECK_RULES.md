# PRE_TASK_CHECK Rules

## Marker Definition

| Marker | Meaning  | Action Required               |
| ------ | -------- | ----------------------------- |
| [✓]    | Verified | None - proceed                |
| [→]    | Inferred | Confirm before proceeding     |
| [?]    | Unknown  | Investigate before proceeding |

Rule: All items must be [✓] to proceed. Any [→] or [?] requires resolution first.

## Checklist Items (7 total)

| #   | Item          | Check Criteria                                           |
| --- | ------------- | -------------------------------------------------------- |
| 1   | Purpose       | Why needed + user's underlying intent (not just literal) |
| 2   | Scope         | Identified target files/functions                        |
| 3   | Constraints   | Technical requirements + limitations + dependencies      |
| 4   | Completion    | Done criteria + verification method + edge cases         |
| 5   | Context       | Check `.codemaps/architecture.md` first, then read code  |
| 6   | Components    | Affected areas + potential risks                         |
| 7   | Prerequisites | Confirmed tech stack/conventions                         |

## Task Decomposition

Split when ANY threshold exceeded:

| Condition | Threshold |
| --------- | --------- |
| Files     | ≥5        |
| Features  | ≥3        |
| Layers    | ≥3        |
| Lines     | ≥200      |

## Flow

1. Check 7 items → mark [✓]/[→]/[?]
2. Any non-[✓]? → Resolve first (ask/read)
3. All [✓]? → Show check → Confirm with user
4. Threshold exceeded? → Decompose
5. Execute

## When to Skip

- Simple questions/confirmations
- Read-only queries
- Follow-up clarifications
- Continuation of approved plan (same session)
- Sequential edits to same file(s)
- User explicitly says "just do it" or "skip check"

## "No Change" Verification Gate

Before reporting "No Change Required":

1. Evidence: Cite specific file:line read
2. Explanation: Why current state meets goal
3. Confirmation: AskUserQuestion to verify
