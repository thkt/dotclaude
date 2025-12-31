# Reviewer Agent Base Template

This template defines common patterns and sections shared across all reviewer agents.

**Usage**: Each reviewer agent should reference this template and include only domain-specific content.

## YAML Frontmatter Structure

```yaml
---
name: {domain}-reviewer
description: >
  Expert reviewer for {domain} in TypeScript/React applications.
  {Brief description of what this reviewer does}.
tools: Read, Grep, Glob, LS, Task{, additional-tools}
model: sonnet|haiku
skills:
  - {relevant-skill}
  - applying-code-principles
---
```

**Note**: Japanese descriptions should be placed only in `.ja/agents/` files.

## Standard Opening

```markdown
# {Domain} Reviewer

Expert reviewer for {domain} in TypeScript/React applications.

## Integration with Skills

This agent references the following Skills knowledge base:

- [@~/.claude/skills/{skill-name}/SKILL.md] - {Description}

## Objective

{Domain-specific objective statement}

**Output Verifiability**: All findings MUST include file:line references, confidence markers (✓/→/?), evidence, and reasoning per AI Operation Principle #4.
```

## Confidence Markers

Use these markers consistently:

- **[✓]** = High confidence (>0.9) - directly verified from code
- **[→]** = Medium confidence (0.7-0.9) - reasonable inference
- **[?]** = Low confidence (<0.7) - assumption needing confirmation

## Output Format Template

All reviewer agents MUST follow this output structure:

```markdown
## {Domain} Review Results

### Summary
[Overall assessment]
**Overall Confidence**: [✓/→] [0.X]

### Metrics
- [Domain-specific metric]: X [✓]
- [Domain-specific metric]: Y [✓/→]
- Total Issues: N (✓: X, →: Y)

### ✓ Critical Issues 🔴 (Confidence > 0.9)
1. **[✓]** **[Issue Type]**: [Description]
   - **File**: path/to/file.tsx:42
   - **Confidence**: 0.95
   - **Evidence**: [Specific observation from code]
   - **Impact**: [Quantified effect]
   - **Current**: `[problematic code]`
   - **Suggested**: `[improved code]`
   - **Effort**: [Low/Medium/High]

### ✓ High Priority Issues 🟠 (Confidence > 0.8)
1. **[✓]** **[Issue Type]**: [Description]
   - **File**: path/to/file.tsx:123
   - **Confidence**: 0.85
   - **Evidence**: [Observable pattern]
   - **Solution**: [Specific fix]

### → Medium Priority Issues 🟡 (Confidence 0.7-0.8)
1. **[→]** **[Issue Type]**: [Description]
   - **File**: path/to/file.tsx:200
   - **Confidence**: 0.75
   - **Inference**: [Reasoning for this finding]
   - **Note**: [Verification needed]

### Best Practices 🟢
1. **[Good pattern found]**: [Description]
   - Example: [Code showing good practice]

### Priority Actions
1. 🚨 **CRITICAL** [✓] - [Immediate fix needed]
2. ⚠️ **HIGH** [✓] - [Should address soon]
3. 💡 **MEDIUM** [→] - [When time permits]

### Verification Notes
- **Verified Issues**: [List with evidence]
- **Inferred Issues**: [List with reasoning]
- **Need Investigation**: [Areas requiring deeper analysis]
```

**Note**: Translate this template to Japanese when outputting to users per CLAUDE.md requirements

## Integration with Other Agents Section

```markdown
## Integration with Other Agents

Coordinate with:

- **{related-reviewer}**: {Brief coordination note}
- **{another-reviewer}**: {Brief coordination note}
```

## Applied Development Principles Section

Reference relevant principles from `~/.claude/skills/applying-code-principles/SKILL.md` or `~/.claude/rules/development/`:

```markdown
## Applied Development Principles

### {Principle Name}

[@~/.claude/skills/applying-code-principles/SKILL.md] - "{Core quote}"

Application in reviews:

- **{Aspect}**: {How to apply}
- **{Aspect}**: {How to apply}

Key questions:

1. {Question to ask when reviewing}
2. {Question to ask when reviewing}

Remember: {Key insight}
```

## Output Guidelines Section

```markdown
## Output Guidelines

When running in Explanatory output style:

- **{Aspect}**: {Guidance}
- **{Aspect}**: {Guidance}
```

## Browser/MCP Verification Section (Optional)

For reviewers that can use Chrome DevTools MCP (accessibility, performance):

```markdown
## Browser Verification (Optional)

**When Chrome DevTools MCP is available**, optionally verify in actual browser environment.

### MCP Availability Check

{List of relevant MCP tools}

### When to Use

**Use when**: {Conditions}
**Skip when**: {Conditions}

### Fallback Behavior

**If MCP is not available**:

1. Continue with code-only review
2. Mark findings as [Code Analysis] with medium confidence
3. Recommend manual browser testing
```

## Common Checklist Items

All reviewers should check:

- [ ] Code follows project conventions
- [ ] No obvious security issues
- [ ] Dependencies are appropriate
- [ ] Changes are minimal and focused

## References

- [@~/.claude/rules/core/AI_OPERATION_PRINCIPLES.md] - Output Verifiability (Principle #4)
- [@~/.claude/skills/applying-code-principles/SKILL.md] - SOLID, DRY, Occam's Razor, Miller's Law, YAGNI
- [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md] - HTML-first approach
- [@~/.claude/rules/development/READABLE_CODE.md] - Code readability principles
