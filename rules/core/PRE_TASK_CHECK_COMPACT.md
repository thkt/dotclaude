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
🧠 理解度: [██████████] XX%
✅ 明確: [✓]/[→] items
❓ 不明: [?] items
💡 推奨: /command
⚡ 実行可能性: 🟢/🟡/🔴

確認後に実行 (Y/n)
```

## Flow

1. Analyze → mark confidence
2. If <95% → ask questions → STOP
3. If ≥95% → show check → wait for Y
4. Show impact → execution plan → wait for Y
5. Execute

## Full Details

[@~/.claude/rules/core/PRE_TASK_CHECK.md](./PRE_TASK_CHECK.md)
