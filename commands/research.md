---
description: >
  Perform project research and technical investigation without implementation.
  Explore codebase structure, technology stack, dependencies, and patterns.
  Documents findings persistently for future reference (/think integration).
allowed-tools: Bash(tree:*), Bash(ls:*), Bash(git log:*), Bash(git diff:*), Bash(grep:*), Bash(cat:*), Bash(head:*), Bash(wc:*), Read, Glob, Grep, LS, Task
model: inherit
argument-hint: "[research topic or question]"
dependencies: [Explore]
---

# /research - Project Research & Investigation

## Purpose

Investigate codebase with confidence-based findings (✓/→/?), without implementation.

## Dynamic Project Discovery

### Recent Activity

```bash
!`git log --oneline -10 || echo "Not a git repository"`
```

### Technology Stack

```bash
!`ls -la package.json pyproject.toml go.mod Cargo.toml 2>/dev/null | head -5 || echo "No standard project files"`
```

### Modified Files

```bash
!`git diff --name-only HEAD~1 2>/dev/null | head -10 || echo "No recent changes"`
```

### Test Framework

```bash
!`grep -E "jest|mocha|vitest|pytest" package.json 2>/dev/null | head -3 || echo "No test framework detected"`
```

## Research Process

### Phase 1: Scope Discovery (30 sec)

- Project structure and patterns
- Frameworks, libraries, tools
- Entry points and APIs

### Phase 2: Investigation (1-3 min)

- Execute parallel searches via Task agent
- Trace dependencies and relationships
- Read documentation and key files

### Phase 3: Synthesis (1 min)

- Score findings by confidence
- Identify patterns and relationships
- Document unknowns explicitly

## Confidence Markers

Use throughout all findings:

- **[✓]** High (>0.8) - Directly verified from code/files
- **[→]** Medium (0.5-0.8) - Reasonable inference from evidence
- **[?]** Low (<0.5) - Assumption requiring verification

## Task Agent Usage

Use Explore agent for complex investigations:

```typescript
Task({
  subagent_type: "Explore",
  thoroughness: "medium", // "quick" | "medium" | "very thorough"
  description: "Codebase investigation",
  prompt: `
    Topic: "${researchTopic}"

    Investigate:
    1. Architecture: structure, entry points [✓]
    2. Tech stack: frameworks, versions [✓]
    3. Key components: modules, APIs [→]
    4. Patterns: conventions, practices [→]
    5. Unknowns: what needs verification [?]

    Return findings with:
    - Confidence markers (✓/→/?)
    - Evidence (file:line references)
    - Clear facts vs inferences distinction
  `
})
```

### Thoroughness Selection

| Context | Level | Duration |
|---------|-------|----------|
| First exploration | quick | 30 sec |
| Implementation prep | medium | 2-3 min |
| Debugging/root cause | very thorough | 5 min |

## Output Requirements

### Golden Master Reference

Use for **structure only**:
[@~/.claude/golden-masters/documents/research/example-context.md]

**IMPORTANT**:

- ✅ Copy: Section structure, marker usage (✓/→/?), format
- ❌ Do NOT copy: Actual content from the reference

### Required Sections

1. **Purpose** - Why this research
2. **Prerequisites** - Facts [✓], Assumptions [→], Unknowns [?]
3. **Available Data** - Files, stack, existing implementation
4. **Constraints** - Security, performance, compatibility
5. **Key Findings** - Summarized with confidence
6. **References** - Links to detailed docs

## Persistent Documentation

**Always save two files**:

### 1. Detailed Findings

```text
.claude/workspace/research/YYYY-MM-DD-[topic].md
```

Full research report with all discoveries.

### 2. Context File (for /think integration)

```text
.claude/workspace/research/YYYY-MM-DD-[topic]-context.md
```

Structured context following Golden Master format.

Display after save:

```text
📄 Research saved:
   Findings: .claude/workspace/research/[date]-[topic].md
   Context:  .claude/workspace/research/[date]-[topic]-context.md
```

## Best Practices

1. **Start broad** - Overview before deep dive
2. **Parallel search** - Use Task agent for 5+ searches
3. **Mark confidence** - Every finding needs ✓/→/?
4. **Cite evidence** - Include file:line references
5. **Admit unknowns** - Explicitly list gaps with [?]
6. **Save context** - Always generate context file for /think

## Usage Examples

```bash
# Topic-based research (auto-selects depth)
/research "authentication system"

# Force quick overview
/research --quick "API structure"

# Force deep analysis
/research --deep "complete architecture"

# No topic (explores current project)
/research
```

## Next Steps

After research:

- **Need planning** → `/think` (auto-detects context file)
- **Found issues** → `/fix` for targeted solutions
- **Ready to build** → `/code` for implementation
