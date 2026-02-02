# PRE_TASK_CHECK

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

Graph calculation: `verified_count / 7 × 100%`

| Graph        | %    |
| ------------ | ---- |
| [██████████] | 100% |
| [███████░░░] | 71%  |
| [████░░░░░░] | <50% |

## Flow

1. Check 7 items → mark [✓]/[→]/[?]
2. Any non-[✓]? → Resolve first (ask/read)
3. All [✓]? → Show check → Confirm with user
4. Threshold exceeded? → Decompose
5. Execute

## Task Decomposition

Split when ANY threshold exceeded:

| Condition | Threshold |
| --------- | --------- |
| Files     | ≥5        |
| Features  | ≥3        |
| Layers    | ≥3        |
| Lines     | ≥200      |

## When to Skip

- Simple questions/confirmations or read-only queries
- Follow-up clarifications or sequential edits to same file(s)
- Continuation of approved plan (same session)
- User explicitly says "just do it" or "skip check"

## Done Definition Templates

Note: Add "- [ ] No change required if [condition]" to any template if existing state may be sufficient.

### Feature

```markdown
- [ ] Specified functionality works
- [ ] No regression | Tests added
```

### Fix

```markdown
- [ ] Issue no longer reproduces
- [ ] Root cause resolved
```

### Refactor

```markdown
- [ ] Behavior unchanged (tests pass)
- [ ] Quality improved (measurable)
```

### Investigation (Bug/Issue)

```markdown
- [ ] Reproduction steps confirmed
- [ ] Root cause identified (not just symptoms)
- [ ] Normal case understood (for diff detection)
```

## "No Change" Verification

Before reporting "No Change Required":

1. Evidence: Cite specific file:line read
2. Explanation: Why current state meets goal
3. Confirmation: AskUserQuestion to verify

```markdown
📋 No Change Analysis:

- Read: src/auth/login.ts:45-67
- Current: Already handles error case X
- Conclusion: Existing implementation meets requirement
  → Confirm with user before closing
```
