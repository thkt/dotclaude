---
description: >
  Generate project-specific skill from ADR for context-aware implementation guidance. Creates skill with references, examples, and validation.
  Saves to .claude/skills/, enables automatic discovery. Provides implementation guidance based on architecture decisions.
  Use when ADR needs to guide implementation with comprehensive context and examples.
  ADRからプロジェクト固有のスキルを生成し、コンテキストに応じた実装ガイダンスを提供。
allowed-tools: Read, Write, Edit, Bash(ls:*), Bash(mkdir:*), Bash(cat:*), Grep, Glob
model: inherit
argument-hint: "[ADR number]"
---

# /adr:skill - Generate Skill from ADR

## Purpose

Convert Architecture Decision Record (ADR) into an executable skill format. Unlike `/adr:rule` which enforces constraints, skills provide context-aware implementation patterns triggered by keywords.

**Key Differences:**

| Aspect | /adr:rule | /adr:skill |
|--------|-----------|------------|
| Purpose | Enforce constraints | Suggest patterns |
| Application | Always active | Triggered by keywords |
| Output | docs/rules/ | .claude/skills/ |
| Content | Must/Must not | How-to + checklist |
| Integration | CLAUDE.md | Auto-discovered |

## Usage

```bash
/adr:skill <ADR-number> [options]
```

**Examples:**

```bash
/adr:skill 0001              # Project-specific skill
/adr:skill 0001 --global     # Global skill (~/.claude/skills/)
/adr:skill 12 --name api-fetching  # Custom name
```

**Options:**

- `--global` - Create in `~/.claude/skills/` (accessible across projects)
- `--name <name>` - Override auto-generated name
- `--preview` - Show generated skill without saving

## Execution Flow

### 1. Read ADR File

```bash
# Zero-pad ADR number
ADR_NUM=$(printf "%04d" $1)

# Find ADR file in project
ADR_FILE=$(ls docs/adr/${ADR_NUM}-*.md 2>/dev/null | head -1)

if [ -z "$ADR_FILE" ]; then
  echo "❌ Error: ADR-${ADR_NUM} not found in docs/adr/"
  exit 1
fi
```

### 2. Parse ADR Content

Extract key sections for skill generation:

- **Title**: Basis for skill name and description
- **Context**: Background for "Why" section
- **Decision**: Core implementation pattern
- **Consequences**: Tips and caveats
- **Technical Terms**: For trigger keywords

**Example Extraction:**

```markdown
# Input: docs/adr/0001-use-react-query.md

Title: "Use React Query for API Data Fetching"
Decision: "Adopt React Query as standard library for server state management"
Context: "Need consistent caching and synchronization strategy"

↓ Extracted for Skill

name: adr-0001-use-react-query
triggers: ["React Query", "API", "データ取得", "fetch", "server state"]
pattern: React Query implementation pattern
```

### 3. Generate Skill Name

```bash
# Convert title to kebab-case
# "Use React Query for API" → "adr-0001-use-react-query"

SKILL_NAME=$(echo "adr-${ADR_NUM}-${TITLE}" | \
  tr '[:upper:]' '[:lower:]' | \
  sed 's/ /-/g' | \
  sed 's/[^a-z0-9-]//g' | \
  sed 's/--*/-/g')

# Default path (project-specific)
SKILL_DIR=".claude/skills/${SKILL_NAME}"
```

### 4. Extract Trigger Keywords

Automatically identify technical terms from ADR:

**Extraction logic:**

```javascript
// From title and decision sections
const titleWords = extractTechnicalTerms(title);
const decisionWords = extractTechnicalTerms(decision);

// Add Japanese translations for bilingual support
const triggers = [
  ...titleWords,
  ...decisionWords,
  ...getJapaneseTranslations(titleWords)
];

// Example output:
// ["React Query", "API", "fetch", "データ取得", "server state", "caching"]
```

**Manual Review:**

Display extracted keywords and prompt for confirmation:

```text
📝 Extracted trigger keywords:

English: React Query, API, fetch, server state, caching
Japanese: データ取得, サーバー状態, キャッシュ

Add/Remove keywords? (press Enter to accept, or edit)
> [Additional keywords]
```

### 5. Determine Allowed Tools

Infer required tools from ADR content:

```javascript
const tools = ['Read', 'Grep', 'Glob'];  // Base tools

// Add based on content analysis
if (hasCodeExamples) tools.push('Write', 'Edit');
if (hasSecurityContent) tools.push('Task');
if (hasBrowserContent) tools.push('mcp__chrome-devtools__*');
if (hasWebAPIs) tools.push('mcp__mdn__*');
```

### 6. Generate Skill File Structure

````markdown
---
name: adr-NNNN-{kebab-case-title}
description: >
  {ADR decision summary}
  Triggers on keywords: {extracted keywords}
  Auto-activates during implementation.
  Provides project-specific patterns from ADR-{number}.
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

[Convert ADR Decision into actionable pattern]

### Recommended Approach

```{language}
// Pattern derived from ADR
```

### Key Points

- [Point 1 from ADR Decision]
- [Point 2 from rationale]
- [Point 3 from consequences]

## 📋 Implementation Checklist

Before implementing, verify:

- [ ] [Requirement 1 from ADR]
- [ ] [Requirement 2]
- [ ] [Consideration 3]

After implementation:

- [ ] [Verification 1]
- [ ] [Verification 2]

## 💡 Usage Examples

### Scenario 1: {Common use case}

```{language}
// Example implementation
```

### Scenario 2: {Edge case}

```{language}
// Handle edge case
```

## ⚠️ Important Considerations

[Derived from ADR Consequences - Negative]

### What to Avoid

- ❌ [Anti-pattern 1]
- ❌ [Anti-pattern 2]

### When NOT to Use

[Scenarios where this pattern shouldn't apply]

## 🔗 References

- **Source ADR**: [ADR-{number}: {title}](../../docs/adr/{NNNN}-{title}.md)
- **Created**: {YYYY-MM-DD}
- **Related Skills**: [If applicable]

---

*This skill was automatically generated from ADR-{number}. Edit freely to refine implementation guidance.*
````

### 7. Create Bilingual Version

Automatically create Japanese version in parallel:

```bash
# English version
SKILL_FILE="${SKILL_DIR}/SKILL.md"

# Japanese version (同時作成)
JA_SKILL_DIR="~/.claude/ja/skills/${SKILL_NAME}"
JA_SKILL_FILE="${JA_SKILL_DIR}/SKILL.md"

# Keep YAML frontmatter in English
# Translate main content to Japanese
```

### 8. Detect Duplicate Skills

Check for existing skills with similar trigger keywords:

```bash
# Search existing skills for keyword overlap
for existing in .claude/skills/*/SKILL.md; do
  # Extract triggers from existing skill
  # Compare with new skill triggers
  # Calculate similarity score
done

# Warn if >50% overlap
if [ $OVERLAP -gt 50 ]; then
  echo "⚠️  Warning: Similar skill exists:"
  echo "  - Existing: ${EXISTING_SKILL}"
  echo "  - Overlap: ${OVERLAP}%"
  echo ""
  echo "Continue? (Y/n)"
fi
```

### 9. Completion Message

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Skill Generated

📄 Source ADR: docs/adr/0001-use-react-query.md
🎯 Skill: .claude/skills/adr-0001-use-react-query/SKILL.md
🌐 Japanese: ~/.claude/ja/skills/adr-0001-use-react-query/SKILL.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Generated Skill

**Name:** adr-0001-use-react-query
**Triggers:** React Query, API, fetch, データ取得
**Purpose:** Provide React Query implementation pattern

### Auto-Activation

This skill will automatically trigger when you:
- Implement API data fetching
- Mention "React Query" or "API"
- Work on server state management

### Preview

The skill provides:
✓ Implementation checklist
✓ Code examples
✓ Common pitfalls to avoid
✓ Project-specific patterns

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Skill is ready to use. Try mentioning "API data fetching" to trigger it!
```

## Skill vs Rule Decision Guide

When to use `/adr:skill` vs `/adr:rule`:

### Use `/adr:rule` when

- ✅ Absolute constraint ("MUST" / "MUST NOT")
- ✅ Security requirement
- ✅ Always enforce regardless of context
- ✅ Simple do/don't instruction

**Examples:**

- "Never store passwords in plain text"
- "Always use parameterized queries"
- "Must enable TypeScript strict mode"

### Use `/adr:skill` when

- ✅ Implementation pattern ("HOW TO")
- ✅ Context-dependent guidance
- ✅ Detailed examples needed
- ✅ Multiple scenarios to cover

**Examples:**

- "How to implement authentication with Auth.js"
- "React Query pattern for API data fetching"
- "Monorepo package dependency guidelines"

### Both Can Coexist

Often, you'll want both:

```bash
# Constraint: Must use React Query
/adr:rule 0001  # Enforces usage

# Pattern: How to use it correctly
/adr:skill 0001  # Provides implementation guidance
```

## Error Handling

### 1. ADR Not Found

```text
❌ Error: ADR-0001 not found

Searched in: docs/adr/
Available ADRs:
- 0002-authentication-strategy.md
- 0003-monorepo-structure.md

Use correct number:
/adr:skill 0002
```

### 2. Skill Already Exists

```text
⚠️  Skill already exists: .claude/skills/adr-0001-use-react-query/

Options:
1. Overwrite (y)
2. Create with different name (n + specify name)
3. Cancel (c)

Your choice (y/n/c): n
New skill name: api-react-query-pattern
```

### 3. No Trigger Keywords Found

```text
⚠️  Warning: Could not automatically extract trigger keywords

Please provide keywords manually:
Enter keywords (comma-separated):
> API, data fetching, React Query, キャッシュ

✓ Keywords added
```

### 4. Duplicate Detection

```text
⚠️  Warning: Similar skill detected

Existing skill: progressive-enhancement (overlap: 65%)
- Shared triggers: "optimization", "performance"

Recommendations:
1. Merge into existing skill
2. Use different trigger keywords
3. Proceed anyway

Your choice (1/2/3): 2
```

## Usage Examples

### Example 1: API Data Fetching Pattern

```bash
# Create ADR
/adr "Use React Query for API Data Fetching"

# Generate skill
/adr:skill 0001
```

**Generated:** `.claude/skills/adr-0001-use-react-query/SKILL.md`

**Triggers on:**

- "API", "fetch", "React Query"
- "データ取得", "サーバー状態"

**Provides:**

- React Query setup pattern
- Query key naming conventions
- Error handling examples
- Caching strategies

### Example 2: Authentication Pattern

```bash
/adr "Implement Auth.js for Authentication"
/adr:skill 0002 --global  # Available across all projects
```

### Example 3: Monorepo Guidelines

```bash
/adr "Turborepo Monorepo Structure"
/adr:skill 0003
```

## Best Practices

### 1. Review Before Saving

Always use `--preview` first:

```bash
/adr:skill 0001 --preview
# Review generated content
# Adjust triggers if needed
# Then save without --preview
```

### 2. Refine Trigger Keywords

Generic keywords lead to noise:

```bash
# ❌ Too generic
triggers: ["code", "implement", "コード"]

# ✅ Specific to pattern
triggers: ["React Query", "API caching", "server state", "useQuery"]
```

### 3. Add Concrete Examples

The more specific, the more useful:

````markdown
## ✅ Good Example

```typescript
// Project-specific: User data fetching
const { data, isLoading } = useQuery({
  queryKey: ['user', userId],  // Naming convention from ADR
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000,  // 5min as per ADR
});
```
````

### 4. Keep Skills Updated

When ADR changes, regenerate skill:

```bash
# Update ADR
vim docs/adr/0001-use-react-query.md

# Regenerate skill
/adr:skill 0001  # Confirm overwrite
```

## Integration with Workflow

### Complete ADR → Implementation Workflow

```bash
# 1. Document decision
/adr "Use React Query for API"

# 2. Create enforcement rule (if needed)
/adr:rule 0001  # "Must use React Query"

# 3. Create implementation skill
/adr:skill 0001  # "How to use React Query"

# 4. Implement feature
# → Skill auto-triggers on "API" mention
# → Provides project-specific guidance
```

### Project Onboarding

New team members benefit from generated skills:

```bash
# Generate skills from all ADRs
for adr in docs/adr/*.md; do
  num=$(basename "$adr" | grep -o '^[0-9]*')
  /adr:skill "$num"
done

# Result: Complete project pattern library
```

## Related Commands

- `/adr [title]` - Create ADR
- `/adr:rule <number>` - Generate enforcement rule
- `/research` - Technical research for ADR
- `/audit` - Review skill effectiveness

## Tips

1. **Specific Triggers**: Use technical terms, not generic words
2. **Real Examples**: Include actual project code, not generic samples
3. **Checklist Focus**: Make checklists actionable and specific
4. **Regular Updates**: Regenerate when ADR evolves
5. **Team Review**: Get feedback on trigger keywords and patterns

## FAQ

**Q: Can I manually edit generated skills?**
A: Yes! Skills are templates. Refine them after generation.

**Q: How do I test if skill triggers correctly?**
A: Mention trigger keywords in conversation and observe activation.

**Q: Should every ADR become a skill?**
A: No. Only ADRs with implementation patterns benefit from skills.

**Q: Can I merge multiple ADRs into one skill?**
A: Currently no. Manually create composite skill if needed.

**Q: What if triggers overlap with existing skills?**
A: Tool warns you. Refine keywords or merge skills manually.

**Q: Do skills work in private projects?**
A: Yes, project-specific skills (`.claude/skills/`) are private.

## Advanced Usage

### Custom Skill Templates

Create custom template for your project:

```bash
# Create template
cat > .claude/templates/skill-template.md << 'EOF'
# Custom project skill template
# Used by /adr:skill command
EOF

# Use template
/adr:skill 0001 --template .claude/templates/skill-template.md
```

### Bulk Generation

Generate skills from all ADRs:

```bash
find docs/adr -name '*.md' | while read adr; do
  num=$(basename "$adr" | grep -o '^[0-9]*')
  /adr:skill "$num" --auto-confirm
done
```

### Skill Analytics

Track skill usage:

```bash
# Check which skills are most triggered
grep "Skill triggered" ~/.claude/logs/*.log | \
  awk -F: '{print $2}' | \
  sort | uniq -c | sort -rn
```
