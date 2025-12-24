# Command Workflows

## Quick Reference

| Pattern | Workflow | When |
|---------|----------|------|
| Quick Fix | `/fix` | Small bug, dev env |
| Investigation | `/research` → `/fix` | Unknown cause |
| Feature | `/research` → `/think` → `/code` → `/test` → `/audit` → `/validate` | New capability |

## Selection Matrix

| Criteria | High Priority | Medium Priority | Low Priority |
|----------|---------------|-----------------|--------------|
| **Understanding** | ≥95% → direct | 70-94% → `/research` | <70% → clarify |
| **Complexity** | Multi-step → workflow | Single file → `/fix` | Unclear → `/think` |
| **Urgency** | Critical → `/fix` | Normal → standard | Planning → `/think` |

## Task Analysis

Match intent to command:

| User Intent | Analysis | Result |
|-------------|----------|--------|
| "X is broken" | Need investigation? | Yes → `/research` → `/fix` |
| "Add Y feature" | Multi-step? | Yes → `/think` → `/code` → `/test` |
| "Site is down" | Critical? | Yes → `/fix` (urgent) |
| "Fix typo" | Simple & clear? | Yes → `/fix` |
| "How does Z work?" | Investigation only | `/research` (no implementation) |

**Key Factors**:

- **Scope**: Single file vs multiple components
- **Context**: Known vs needs exploration
- **Risk**: Dev environment vs production

## Discovery Process

1. **Scan Commands**: `~/.claude/commands/`, `.claude/commands/`
2. **Read YAML**: Extract metadata
3. **Match Intent**: Use Selection Matrix
4. **Score & Rank**: Understanding level, task complexity, environment, urgency

## Edge Cases

| Situation | Action |
|-----------|--------|
| Ambiguous intent | Ask clarification in understanding check |
| No command match | Use `Command: N/A`, proceed with direct implementation |
| Multiple valid approaches | Present options for user choice |
| Unclear requirements | Start with `/research` |
| Complex multi-part | Break into sub-workflows |
