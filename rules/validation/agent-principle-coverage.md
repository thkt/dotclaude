# Agent Principle Coverage Validation

## Purpose

Ensure all agents properly reference and apply development principles for consistent and high-quality reviews.

## Validation Checklist

### Required Sections in All Agents

- [ ] **Applied Development Principles** section exists
- [ ] **Output Guidelines** section exists (for Explanatory style support)
- [ ] **Integration with Other Agents** section exists

### Principle Coverage by Agent Type

#### Frontend Agents

All frontend agents should reference at least one of:

- Occam's Razor (simplicity)
- Progressive Enhancement (if applicable to domain)
- SOLID principles (if applicable to domain)
- DRY (if applicable to domain)

**Validation Table:**

| Agent | Has Principles Section | Key Principles | Output Guidelines |
|-------|----------------------|----------------|-------------------|
| accessibility-reviewer | ✅/❌ | Progressive Enhancement, Occam's Razor | ✅/❌ |
| design-pattern-reviewer | ✅/❌ | (Already has references) | ✅/❌ |
| performance-reviewer | ✅/❌ | Occam's Razor, Progressive Enhancement | ✅/❌ |
| readability-reviewer | ✅/❌ | Readable Code, Miller's Law | ✅/❌ |
| root-cause-reviewer | ✅/❌ | Occam's Razor, DRY, Progressive Enhancement | ✅/❌ |
| security-reviewer | ✅/❌ | Defense in Depth, Least Privilege, Occam's Razor | ✅/❌ |
| structure-reviewer | ✅/❌ | Occam's Razor, DRY, Progressive Enhancement | ✅/❌ |
| testability-reviewer | ✅/❌ | SOLID (DIP, SRP), Occam's Razor | ✅/❌ |
| type-safety-reviewer | ✅/❌ | Type Safety as Documentation, Fail Fast | ✅/❌ |

#### General Agents

| Agent | Has Principles Section | Key Principles | Output Guidelines |
|-------|----------------------|----------------|-------------------|
| document-reviewer | ✅/❌ | Readable Code, Occam's Razor | ✅/❌ |
| progressive-enhancer | ✅/❌ | Progressive Enhancement (core) | ✅/❌ |
| subagent-reviewer | ✅/❌ | Occam's Razor, DRY | ✅/❌ |

### How to Validate

#### Manual Check

```bash
# Check if agent has "Applied Development Principles" section
grep -l "Applied Development Principles" /Users/thkt/.claude/agents/frontend/*.md

# Check if agent has "Output Guidelines" section
grep -l "Output Guidelines" /Users/thkt/.claude/agents/frontend/*.md

# Check principle references
grep -l "OCCAMS_RAZOR" /Users/thkt/.claude/agents/frontend/*.md
grep -l "PROGRESSIVE_ENHANCEMENT" /Users/thkt/.claude/agents/frontend/*.md
```

#### Automated Check (Future)

```bash
# Script location: /Users/thkt/.claude/scripts/validate-agent-principles.sh
# Usage: ./validate-agent-principles.sh
# Output: Report of missing sections and principles
```

## Quality Standards

### Minimum Requirements

Each agent MUST have:

1. At least ONE principle reference that aligns with its domain
2. Clear explanation of HOW the principle applies to reviews
3. Output Guidelines for Explanatory style

### Best Practices

- Reference 2-3 principles (not too many, not too few)
- Include "Application in reviews" subsection
- Provide "Key questions" or "Remember" notes
- Connect principles to agent's specific review focus

## When to Update

- Adding new agent → Ensure principles are referenced
- Modifying agent focus → Update principle references
- Adding new principle → Check which agents should reference it
- Quarterly review → Verify all agents maintain coverage

## Remediation

If an agent fails validation:

1. **Identify missing sections**
   - Add "Applied Development Principles" if missing
   - Add "Output Guidelines" if missing

2. **Determine relevant principles**
   - Review agent's domain
   - Consult PRINCIPLES_GUIDE.md for appropriate principles
   - Check similar agents for reference

3. **Add principle references**
   - Use consistent format across agents
   - Include practical application guidance
   - Provide concrete examples when possible

## Related Documentation

- [@../PRINCIPLES_GUIDE.md](../PRINCIPLES_GUIDE.md) - Overview of all principles
- [@../../agents/](../../agents/) - Agent definitions
- [@./principle-reference-check.md](./principle-reference-check.md) - Principle file validation
