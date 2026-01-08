# PRE_TASK_CHECK Templates

Technical specification for understanding check and execution planning.

## Analysis Method

Analyze user request to determine:

- Understanding percentage
- Clear/unclear elements
- Command selection: Single file → /fix, Multiple → /code, Investigation → /research
- Confidence: <70% → /research, 70-90% → /think, >90% → /code

**Confidence markers**: ✓ (verified), → (inferred), ? (assumed)

## Display Format

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 Understanding Level: [██████░░░░] XX%

✅ Clear elements:

- [✓] [Verified items]
- [→] [Inferred items]

❓ Unclear elements:

- [?] [Needs confirmation]

🎯 Done Definition:

- [ ] [Completion criteria]

💡 Suggested: /command - [reason]

⚡ Feasibility: 🟢/🟡/🔴

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use `AskUserQuestion` to confirm before proceeding.

## Impact Simulation

**When**: After user confirms, before execution, for complex changes.

```markdown
🔍 Impact Simulation

• Files to modify: [2-5 files]
• Affected components: [modules]
• Risk level: 🟢 Low / 🟡 Medium / 🔴 High
• Note: [considerations]
```

**Skip when**: Simple reads, doc-only updates, single file <10 lines.

**Always show when**: Core config changes, 3+ files, auth/security logic.

## Execution Plan

```markdown
📝 Execution Plan

1. [Action]
2. [Action]
```

## Workflow

1. Understanding Check → AskUserQuestion (STOP)
2. Impact Simulation (if complex)
3. Execution Plan → AskUserQuestion (STOP)
4. Execute
