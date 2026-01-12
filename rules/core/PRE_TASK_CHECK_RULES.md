# PRE_TASK_CHECK Rules

## Core Rules

### 95% Understanding Rule

**Never proceed with confidence <95%**. Use `AskUserQuestion` for clarification first.

### When to Execute Check

- File modification (create/edit/delete)
- Command execution
- Multi-step workflow
- Understanding <95%

### When to Skip

- Simple questions, confirmations
- Read-only queries, follow-up clarifications

### Bug Investigation Context

**When to activate**: User reports a problem or unexpected behavior

Context-based criteria:

- Something isn't working as expected
- An error or failure is occurring
- A regression (worked before, not now)
- Unexpected or confusing behavior

When bug context detected, **always ask**:

1. **Reproduction steps**: How to reproduce? (preconditions → steps → error)
2. **Normal case**: When does it work correctly? (for diff detection)
3. **Log information**: Any error logs or console output?

## Command Selection

| Marker | Confidence | Action            | Rationale                |
| ------ | ---------- | ----------------- | ------------------------ |
| [?]    | <70%       | `/research`       | Too uncertain to plan    |
| [→]    | 70-94%     | `/think`          | Plan before implementing |
| [✓]    | ≥95%       | `/code` or direct | Clear enough to proceed  |

## Confirmation

Use `AskUserQuestion` tool for all confirmations and clarifications.

## Flow

1. Analyze → mark confidence
2. If <95% → AskUserQuestion for clarification → STOP
3. If ≥95% → show check → AskUserQuestion to confirm
4. Dry-run / Plan → show based on conditions
5. Execute

### Dry-run Conditions

| Condition                               | Display               |
| --------------------------------------- | --------------------- |
| 3+ files, core config, auth/security    | Full (Dry-run + Plan) |
| Simple, doc-only, single file <10 lines | Plan only             |
