# PRE_TASK_CHECK (Compact)

## Core Rules

### 95% Understanding Rule

**Never proceed with confidence <95%**. Ask clarification questions first.

### When to Execute Check

- File modification (create/edit/delete)
- Command execution
- Multi-step workflow
- Understanding <95%

### When to Skip

- Simple questions, confirmations (y/yes/ok)
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

Proceed after confirmation (Y/n)
```

## Flow

1. Analyze → mark confidence
2. If <95% → ask questions → STOP
3. If ≥95% → show check → wait for Y
4. Show impact → execution plan → wait for Y
5. Execute

## Details

Comprehensive guide: [@./PRE_TASK_CHECK_VERBOSE.md](./PRE_TASK_CHECK_VERBOSE.md)
