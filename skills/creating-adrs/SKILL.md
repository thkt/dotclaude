---
name: creating-adrs
description: >
  Structured ADR creation in MADR format. Triggers: ADR, Architecture Decision,
  決定記録, 技術選定, アーキテクチャ決定, design decision, 技術的決定, 設計判断,
  deprecation, 非推奨化, process change, プロセス変更
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task
---

# ADR Creator

## Purpose

Create Architecture Decision Records in MADR format through a structured 6-phase process.

## 6-Phase Process Overview

| Phase | Purpose | Key Actions |
| --- | --- | --- |
| 1. Pre-Check | Prevent duplicates | Check existing ADRs, validate naming, verify directory |
| 2. Template | Select structure | Choose from 4 templates based on decision type |
| 3. References | Gather evidence | Collect project docs, issues, PRs, external resources |
| 4. Validate | Quality assurance | Verify required sections, check completeness |
| 5. Index | Update documentation | Auto-generate ADR list, cross-link related ADRs |
| 6. Recovery | Handle errors | Auto-fix paths, fallback templates |

## Template Selection

| Template | Use Case | Required Sections |
| --- | --- | --- |
| technology-selection | Library, framework choices | Options (min 3), Pros/Cons |
| architecture-pattern | Structure, design policy | Context, Consequences |
| process-change | Workflow, rule changes | Before/After comparison |
| deprecation | Retiring technology | Migration plan, Timeline |

## Execution Flow

### Phase 1: Pre-Check

```bash
# Find existing ADRs
ADR_DIR="docs/adr"
ls -la ${ADR_DIR}/*.md 2>/dev/null

# Check for duplicate titles
grep -l "similar-title" ${ADR_DIR}/*.md

# Get next number
NEXT_NUM=$(ls ${ADR_DIR}/*.md | wc -l)
NEXT_NUM=$((NEXT_NUM + 1))
printf "%04d" $NEXT_NUM
```

### Phase 2: Template Selection

Determine template from decision type:

```markdown
Decision Type Analysis:
- Contains "use", "adopt", "select" → technology-selection
- Contains "structure", "pattern", "design" → architecture-pattern
- Contains "change", "update", "modify" → process-change
- Contains "deprecate", "remove", "migrate" → deprecation
```

### Phase 3: Reference Collection

Gather supporting evidence:

- **Project docs**: README, existing ADRs, tech specs
- **Issues/PRs**: Related discussions, requirements
- **External**: Official docs, benchmark data, community feedback

### Phase 4: Validation

All ADRs must include these sections:

| Section | Requirement | Validation |
| --- | --- | --- |
| Title | ADR-NNNN: [Name] | Pattern match |
| Status | proposed/accepted/deprecated/superseded | Enum check |
| Context | Problem statement | Min 50 chars |
| Decision | What and why | Min 100 chars |
| Consequences | Positive + Negative | Both required |

Optional but recommended:

- **Considered Options** - Min 3 for technology-selection
- **Pros/Cons** - Comparison table
- **Confirmation** - Verification method
- **Related ADRs** - Cross-references

### Phase 5: Index Update

Auto-generate `docs/adr/README.md`:

```markdown
# Architecture Decision Records

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [0001](./0001-*.md) | Title | accepted | YYYY-MM-DD |
```

### Phase 6: Error Recovery

| Error | Recovery Action |
| --- | --- |
| Directory missing | Create `docs/adr/` |
| Duplicate title | Suggest alternative or confirm |
| Missing section | Prompt for input |
| Invalid status | Default to "proposed" |

## Skill File Generation Template

When generating skill from ADR (`/adr:skill`):

````markdown
---
name: adr-NNNN-{kebab-case-title}
description: >
  {ADR decision summary}
  Triggers on keywords: {extracted keywords}
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# {ADR Title} - Project Pattern

## 🎯 Background and Decision

[Quoted from ADR Context and Decision]

## ✅ Implementation Pattern

### Recommended Approach

```{language}
// Pattern derived from ADR
```

### Key Points

- [Point 1 from ADR Decision]
- [Point 2 from rationale]

## 📋 Implementation Checklist

Before implementing:

- [ ] [Requirement 1 from ADR]
- [ ] [Requirement 2]

After implementation:

- [ ] [Verification 1]
- [ ] [Verification 2]

## 💡 Usage Examples

### Scenario 1: {Common use case}

```{language}
// Example implementation
```

## ⚠️ Important Considerations

### What to Avoid

- ❌ [Anti-pattern 1]
- ❌ [Anti-pattern 2]

## 🔗 References

- **Source ADR**: [ADR-{number}: {title}](../../docs/adr/{NNNN}-{title}.md)
````

## Trigger Keyword Extraction

Auto-extract from ADR content:

```javascript
// From title and decision sections
const triggers = [
  ...extractTechnicalTerms(title),
  ...extractTechnicalTerms(decision),
  ...getJapaneseTranslations(terms)
];

// Example: "Use React Query for API"
// → ["React Query", "API", "fetch", "データ取得", "server state"]
```

## Skill vs Rule Decision

| Aspect | /adr:rule | /adr:skill |
| --- | --- | --- |
| Purpose | Enforce constraints | Suggest patterns |
| Application | Always active | Triggered by keywords |
| Output | docs/rules/ | .claude/skills/ |
| Content | Must/Must not | How-to + checklist |

**Use rule for**: Security requirements, absolute constraints
**Use skill for**: Implementation patterns, context-dependent guidance

## Error Messages

### ADR Not Found

```text
❌ Error: ADR-0001 not found

Searched in: docs/adr/
Available ADRs:
- 0002-authentication-strategy.md
- 0003-monorepo-structure.md
```

### Skill Already Exists

```text
⚠️  Skill already exists: .claude/skills/adr-0001-*/

Options:
1. Overwrite (y)
2. Create with different name (n)
3. Cancel (c)
```

### Duplicate Detection

```text
⚠️  Similar skill detected

Existing skill: api-fetching (overlap: 65%)
Shared triggers: "API", "fetch"

Recommendations:
1. Merge into existing
2. Use different triggers
3. Proceed anyway
```

## Best Practices

| Practice | Do | Don't |
| --- | --- | --- |
| Triggers | Specific terms: "React Query", "useQuery" | Generic: "code", "implement" |
| Examples | Project-specific code | Generic samples |
| Checklist | Actionable items | Vague guidance |
| Updates | Regenerate when ADR changes | Keep stale skills |

## Directory Structure

```text
docs/adr/
├── README.md          # Auto-generated index
├── 0001-*.md         # Sequential numbering
└── 0002-*.md

.claude/skills/
├── adr-0001-*/       # Generated skills
│   └── SKILL.md
└── adr-0002-*/
    └── SKILL.md
```

## References

- [MADR Official](https://adr.github.io/madr/)
- [@~/.claude/commands/adr.md](~/.claude/commands/adr.md) - /adr command
- [@~/.claude/commands/adr/skill.md](~/.claude/commands/adr/skill.md) - /adr:skill quick reference
