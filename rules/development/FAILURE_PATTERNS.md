# Failure Patterns

Patterns for AI to detect and suggest appropriate commands.

## Detection and Suggestion

| Pattern              | Trigger                      | Suggest                    |
| -------------------- | ---------------------------- | -------------------------- |
| Context Bloat        | Unrelated topic / usage >70% | `/clear` or `/compact`     |
| Repeated Fixes       | 3rd attempt at same error    | Reframe with specificity   |
| Infinite Exploration | >10 files read, no edits     | Scope down with subagent   |
| Wrong Direction      | "that's not what I wanted"   | `/rewind` to checkpoint    |
| Long Wait            | User waiting during op       | Suggest `Esc` to interrupt |

When detected: Notify → Suggest → Wait for confirmation
