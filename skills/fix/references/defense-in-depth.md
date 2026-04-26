# Defense-in-Depth Validation

Multi-layer validation for bugs that can recur. Add checks at every layer the failure could pass through, so different code paths or refactors cannot reopen the same bug.

## When to Apply

Driven by the Pattern field from `use-context-root-cause-analysis` (5 Whys output).

| Pattern    | Action                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Isolated   | Skip. Single fix site, no recurrence path                              |
| Recurring  | Apply layers 1-2 at minimum. Similar code nearby, entry/business risks |
| Systematic | Apply all 4 layers. Combine with `/research` escalation                |

## The Four Layers

Each layer validates independently. Full coverage makes the bug structurally impossible.

| Layer | Purpose                           | Applies when                        | Example                              |
| ----- | --------------------------------- | ----------------------------------- | ------------------------------------ |
| 1     | Entry point: reject invalid input | External input is involved          | Throw if required param is empty     |
| 2     | Business logic: data makes sense  | Domain invariants can be violated   | Validate entity state after mutation |
| 3     | Environment guards: context-safe  | Ops have environment-dependent risk | Refuse destructive ops in test env   |
| 4     | Debug instrumentation: forensics  | Failure is hard to reproduce        | Log with stack trace before risky op |

## Applying the Pattern

| # | Step                                                                  |
| - | --------------------------------------------------------------------- |
| 1 | Trace data flow: where bad value originates, where it is consumed     |
| 2 | Map all checkpoints data passes through                               |
| 3 | Select layers by Pattern (see "When to Apply")                        |
| 4 | Add validation at each selected layer                                 |
| 5 | Test each layer independently: bypass one, confirm another catches it |

## Verification

| Check                                  | Required              |
| -------------------------------------- | --------------------- |
| Pattern drove layer selection          | Yes                   |
| Each layer is independently testable   | Yes                   |
| Bypass test ran for at least one layer | Yes (Systematic path) |
