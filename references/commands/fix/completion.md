# Completion & Reporting

Definition of Done and output formatting for `/fix` command.

→ **Common criteria**: [@../../../rules/development/COMPLETION_CRITERIA.md](~/.claude/rules/development/COMPLETION_CRITERIA.md)

## /fix Specific Criteria

**Confidence Target**: Overall ≥0.9

A bug fix is complete when:

- [x] **Root cause identified** (not just symptom, 5 Whys applied)
- [x] **Minimal complexity solution** (Occam's Razor)
- [x] **Quality gates passed** (see shared criteria)
- [x] **No regressions detected**

### Optional (Recommended)

- [Recommended] Additional tests generated (Phase 3.5)
- [Recommended] Documentation updated if behavior changed

## Output Format

### Success Output

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fix Summary

Problem: [User-facing description]
Root Cause: [Why it happened]
Confidence: 0.XX

Solution:
- Files: [modified files]
- Approach: [Direct/Defensive/CSS-first]
- Changes: [Brief description]

Verification:
- Tests: PASS XX/XX passing
- Lint: PASS No issues
- Types: PASS Valid
- Manual: PASS Verified

Status: COMPLETE (Confidence: 0.XX)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Partial Success Output

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[WARN] Fix Partially Complete

Problem: [Description]
Root Cause: [Identified cause]
Confidence: 0.XX

Solution Applied:
- Files: [modified files]
- Approach: [strategy used]

Verification:
- Tests: PASS XX/XX passing
- Lint: WARN 2 warnings (acceptable)
- Types: PASS Valid
- Manual: PASS Verified

Remaining:
- [ ] [Task 1]
- [ ] [Task 2]

Status: IN PROGRESS (Confidence: 0.XX)

Next Steps:
1. [Action 1]
2. [Action 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Escalation

**When to escalate**: If confidence drops below 0.7 at any phase.

### Escalation Output

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[WARN] Low Confidence - Recommend Escalation

Problem: [Description]
Current Confidence: 0.XX (below threshold of 0.7)

Analysis:
- Root cause: [?] Unclear or uncertain
- Complexity: [High/Systematic]
- Scope: [Multiple components]

Recommended Escalation:
-> /research - For deeper investigation
-> /think - For comprehensive solution planning
-> /code - For proper implementation with TDD

Reason: [Why /fix is insufficient]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Escalation Criteria

| Confidence | Phase | Action |
| --- | --- | --- |
| <0.5 | Root Cause | → `/research` immediately |
| 0.5-0.7 | Any | → Ask user: continue or escalate? |
| 0.7-0.8 | Implementation | Proceed with defensive approach |
| >0.8 | Any | Proceed normally |

### Escalation Commands

```bash
# For investigation
/research "Why does [bug] happen?"

# For planning
/think "Redesign [component] with proper [feature]"

# For full implementation
/code "Implement [feature] with TDD"
```

## Applied Principles

Document which principles guided the fix:

### Common Principles

- **Occam's Razor**: Simplest solution chosen
  - Example: "Used Math.max instead of complex validation"

- **TIDYINGS**: Only touched relevant code
  - Example: "Fixed only calculateTotal, left related code unchanged"

- **Progressive Enhancement**: CSS-first for UI
  - Example: "Used Grid layout instead of JavaScript positioning"

- **DRY**: Identified pattern duplication
  - Example: "Found 3 similar discount calculations, refactored to shared function"

### Principle Template

```markdown
## Applied Principles

- **Occam's Razor** ✅
  Chose `Math.max(0, result)` over validation framework

- **TIDYINGS** ✅
  Modified only affected function, kept surrounding code as-is

- **Progressive Enhancement** ✅
  Fixed layout with CSS Grid, no JavaScript needed
```

## Learnings & Documentation

### What Went Well

```markdown
Learnings:
- Root cause quickly identified with Explore agent
- Regression test caught the exact issue
- Minimal fix resolved problem efficiently
```

### What Could Improve

```markdown
Improvements:
- Could add validation earlier in the flow
- Consider extracting discount logic to shared utility
- Update documentation about discount edge cases
```

### Future Prevention

```markdown
Prevention:
- Add similar checks to other discount calculations
- Document edge case handling in README
- Add pre-commit hook for negative value detection
```

## Next Steps

After fix is complete:

### Success Path

1. **Document**: Add comments explaining fix
2. **Commit**: Create meaningful commit message
3. **Review**: Self-review changes
4. **PR**: Create pull request (if needed)

### Follow-up Path

1. **Research**: If similar patterns found
2. **Refactor**: If technical debt identified
3. **Document**: If behavior changed

### No Further Action

Bug fixed, tests pass, done!

## Completion Checklist

Before marking as complete:

- [ ] Root cause documented
- [ ] Fix is minimal and clear
- [ ] All tests passing (0 failures)
- [ ] Lint passes (0 errors)
- [ ] Type check passes
- [ ] Manual verification done
- [ ] Confidence ≥ 0.9
- [ ] No regressions introduced

**If all checked**: Bug fix complete!

## Related Principles

- [@../../../skills/applying-code-principles/SKILL.md](~/.claude/skills/applying-code-principles/SKILL.md) - Simplicity (Occam's Razor)
- [@../../../rules/development/TIDYINGS.md](~/.claude/rules/development/TIDYINGS.md) - Clean as you go
- [@../../../rules/development/PROGRESSIVE_ENHANCEMENT.md](~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md) - CSS-first
