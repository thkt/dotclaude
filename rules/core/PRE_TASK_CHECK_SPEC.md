# PRE_TASK_CHECK Specification

Display formats and templates for understanding check.

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

## Dry-run / Execution Plan

Simulate changes without actual execution to preview effects.

**Guidelines**:

- Keep concise: 3-5 bullet points maximum
- Focus on impact: What will change, what might break
- Risk assessment: Honest evaluation of potential issues

### Pattern A: Full Display (Complex Changes)

When Dry-run conditions are met (3+ files, core config, auth/security):

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Impact Simulation (Dry-run)

• Files to modify: src/auth/login.ts, src/components/LoginForm.tsx
• Affected components: AuthService, UserSession
• Risk level: 🟡 Medium (authentication flow change)
• Note: Existing sessions may require re-login

─────────────────────────────────────────────────

📝 Execution Plan

1. Edit src/auth/login.ts - add OAuth2 flow
2. Edit src/components/LoginForm.tsx - add provider buttons
3. Run tests to verify

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Pattern B: Plan Only (Simple Changes)

When Dry-run is skipped (simple reads, doc-only, single file <10 lines):

```markdown
📝 Execution Plan

1. Edit src/utils/helper.ts - fix typo
2. Run tests
```
