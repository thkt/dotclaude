# PRE_TASK_CHECK Specification

Display format and templates.

## Display Format

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 Understanding: [███████░░░] 71% (5/7 verified)

┌─ Checklist ────────────────────────────────────
│ [✓] Purpose: {why this change is needed}
│ [✓] Scope: {target files/functions}
│ [→] Constraints: {technical constraints} ← confirm
│ [✓] Completion: {what defines done}
│ [✓] Context: {read existing code}
│ [?] Components: {affected areas} ← investigate
│ [✓] Prerequisites: {tech stack, conventions}
└────────────────────────────────────────────────

🎯 Done Definition: [{task_type}]

- [ ] {criteria}
- [ ] No change required if current state is sufficient

⚡ Status: 🟢 Ready / 🟡 Needs confirmation / 🔴 Blocked

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Graph calculation**: `verified_count / 7 × 100%`

| Graph        | %    | Meaning                         |
| ------------ | ---- | ------------------------------- |
| [██████████] | 100% | All [✓] - Ready to proceed      |
| [███████░░░] | 71%  | Some [→]/[?] - Needs resolution |
| [████░░░░░░] | <50% | Many unknowns - /research first |

## Done Definition Templates

### Feature

```markdown
- [ ] Specified functionality works
- [ ] No regression | Tests added
- [ ] No change required if sufficient
```

### Fix

```markdown
- [ ] Issue no longer reproduces
- [ ] Root cause resolved
- [ ] No change required if sufficient
```

### Refactor

```markdown
- [ ] Behavior unchanged (tests pass)
- [ ] Quality improved (measurable)
- [ ] No change required if sufficient
```

### Investigation (Bug/Issue)

```markdown
- [ ] Reproduction steps confirmed
- [ ] Root cause identified (not just symptoms)
- [ ] Normal case understood (for diff detection)
- [ ] No change required if not a bug
```

## "No Change" Verification Gate

**Before reporting "No Change Required":**

1. **Evidence**: Cite specific file:line read
2. **Explanation**: Why current state meets goal
3. **Confirmation**: AskUserQuestion to verify

```markdown
📋 No Change Analysis:

- Read: src/auth/login.ts:45-67
- Current: Already handles error case X
- Conclusion: Existing implementation meets requirement
  → Confirm with user before closing
```
