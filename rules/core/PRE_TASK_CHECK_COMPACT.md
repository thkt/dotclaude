# PRE_TASK_CHECK (Compact)

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

## Confidence Markers

- **[✓]** High - directly verified
- **[→]** Medium - reasonable inference
- **[?]** Low - needs confirmation

## Output Format

```text
🧠 Understanding: [██████████] XX%
✅ Clear: [✓]/[→] items
❓ Unclear: [?] items
💡 Recommended: /command
⚡ Feasibility: 🟢/🟡/🔴
```

## Confirmation

Use `AskUserQuestion` tool for all confirmations and clarifications.

## Flow

1. Analyze → mark confidence
2. If <95% → AskUserQuestion for clarification → STOP
3. If ≥95% → show check → AskUserQuestion to confirm
4. Show impact/plan → AskUserQuestion to confirm
5. Execute
