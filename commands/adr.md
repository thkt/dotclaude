---
name: adr
description: MADR形式でArchitecture Decision Record（ADR）を作成
priority: medium
suitable_for:
  scale: [small, medium, large]
  type: [documentation, decision-making]
  understanding: "any"
  urgency: [low, medium]
aliases: [decision, architecture-decision]
timeout: 60
context:
  files_changed: "docs"
  lines_changed: "100+"
  new_features: true
  breaking_changes: false
---

# /adr - Architecture Decision Record Creator

## Purpose

Record architecture decisions in MADR (Markdown Architecture Decision Records) format. Document the context, alternatives considered, and rationale for decisions to share knowledge across the team.

## Usage

```bash
/adr "Decision title"
```

**Examples:**

```bash
/adr "Adopt TypeScript strict mode"
/adr "Use Auth.js for authentication"
/adr "Introduce Turborepo for monorepo"
```

## Execution Flow

### 1. Check Project Structure

```bash
# Verify project root
pwd

# Check for docs/adr/ directory
ls -la docs/adr/ 2>/dev/null || echo "docs/adr/ not found"
```

### 2. Auto-number ADRs

```bash
# Get latest ADR number
LAST_NUM=$(ls docs/adr/ 2>/dev/null | grep -E '^[0-9]{4}-' | sort -r | head -1 | cut -d'-' -f1)

# Calculate next number (default to 0001)
if [ -z "$LAST_NUM" ]; then
  NEXT_NUM="0001"
else
  NEXT_NUM=$(printf "%04d" $((10#$LAST_NUM + 1)))
fi
```

### 3. Collect Information Interactively

Prompt user for the following information:

**Required fields:**

- Title (from command argument or interactive input)
- Context and problem statement
- Considered options (minimum 2)
- Chosen option
- Decision rationale

**Optional fields:**

- Decision drivers
- Positive consequences
- Negative consequences
- Confirmation method
- Additional information

**Interactive example:**

```text
📋 Creating ADR: Adopt TypeScript strict mode

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ADR Number: 0001

## Required Information

### Context and Problem
Describe the context and problem that requires this decision:
> [User input]

### Considered Options
Enter the options you considered (minimum 2, empty line to finish):

Option 1:
> [User input]

Option 2:
> [User input]

Option 3:
> [Empty line to finish]

### Chosen Option
Which option did you choose? (1-2):
> [User input]

### Decision Rationale
Explain why you chose this option:
> [User input]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Optional Information (y/yes to skip)

### Decision Drivers
Enter factors that influenced the decision:
> [User input or Enter]

### Positive Consequences
Enter expected positive outcomes:
> [User input or Enter]

### Negative Consequences
Enter expected trade-offs:
> [User input or Enter]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4. Generate Slug from Title

```bash
# Convert title to slug
# Simple implementation: lowercase + space to hyphen + remove special chars
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g')

# Filename format: NNNN-slug.md
FILENAME="${NEXT_NUM}-${SLUG}.md"
```

### 5. Generate MADR Format File

```markdown
# [Title]

- Status: proposed
- Deciders: [Project team]
- Date: [YYYY-MM-DD]

## Context and Problem Statement

[User input]

## Decision Drivers

[User input or omitted]

## Considered Options

[Options list]

## Decision Outcome

Chosen option: [Selected option]

Rationale: [Decision rationale]

## Consequences

### Positive Consequences

[User input or omitted]

### Negative Consequences

[User input or omitted]

## Confirmation

[User input or omitted]

## More Information

[User input or omitted]

---

*Created: [YYYY-MM-DD]*
*Author: Claude Code*
```

### 6. Save and Confirm

```bash
# Create directory if it doesn't exist
mkdir -p docs/adr

# Save file using Write tool

# Display success message
echo "✅ ADR created: docs/adr/${FILENAME}"
```

### 7. Suggest Next Steps

Display completion message with next action suggestion:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ADR Created

📄 File: docs/adr/0001-typescript-strict-mode.md
📊 Number: 0001
📅 Created: 2025-10-01

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next Steps:
Generate project rule from this ADR:
  /adr:rule 0001

This converts the decision into AI-executable rule format
and automatically adds it to `.claude/CLAUDE.md`.
```

## Error Handling

### 1. Not in Project Root

```text
❌ Error: Please run from project root

Current directory: /Users/user/
Recommended: Navigate to project directory

Example:
cd /path/to/your/project
/adr "Decision title"
```

### 2. Failed to Create docs/adr/ Directory

```text
❌ Error: Cannot create docs/adr/ directory

Check permissions:
chmod +w docs/
```

### 3. Missing Required Field

```text
❌ Error: [Field name] is required

ADR creation requires:
- Title
- Context and problem statement
- Considered options (minimum 2)
- Chosen option
- Decision rationale
```

## MADR Format Explanation

### Section Structure

| Section | Required | Description |
|---------|----------|-------------|
| Title | ✅ | Concise description of decision |
| Status | ✅ | proposed/accepted/deprecated/superseded |
| Deciders | ✅ | Who made the decision |
| Date | ✅ | Decision date |
| Context and Problem | ✅ | Why decision is needed |
| Decision Drivers | ❌ | Factors that influenced decision |
| Considered Options | ✅ | Alternative options considered |
| Decision Outcome | ✅ | Chosen option and rationale |
| Consequences | ❌ | Expected impact (positive/negative) |
| Confirmation | ❌ | How to validate implementation |
| More Information | ❌ | Additional context |

### Status Lifecycle

```text
proposed → accepted → (deprecated) → superseded
```

- **proposed**: Awaiting review
- **accepted**: Adopted, being implemented or implemented
- **deprecated**: Better alternative found
- **superseded**: Replaced by another ADR

## Usage Examples

### Example 1: Technology Selection

```bash
/adr "Adopt Zustand for state management"
```

**Generated ADR:**

```markdown
# Adopt Zustand for State Management

- Status: proposed
- Deciders: Frontend team
- Date: 2025-10-01

## Context and Problem Statement

React application state management has become complex.
Data sharing between components is cumbersome.
Need simple, type-safe state management solution.

## Considered Options

- Zustand: Simple API and lightweight
- Redux Toolkit: Standard but high learning curve
- Jotai: Atomic design but difficult to integrate with existing code

## Decision Outcome

Chosen option: Zustand

Rationale:
- Low learning curve
- Excellent TypeScript support
- Works well with existing React Hooks pattern
- Small bundle size (1KB)

## Consequences

### Positive Consequences

- Faster development
- Better code readability
- Reduced bundle size

### Negative Consequences

- Team learning period (about 1 week)
- Redux experts need time to adapt
```

### Example 2: Architecture Decision

```bash
/adr "Introduce Turborepo for monorepo"
```

### Example 3: Development Process

```bash
/adr "Adopt Conventional Commits for commit messages"
```

## Best Practices

### 1. Be Specific in Title

```text
❌ Bad: "Database selection"
✅ Good: "Adopt PostgreSQL for user data persistence"
```

### 2. Document Alternatives Clearly

Record at least 2 alternatives and explain why others weren't chosen.

### 3. Make Rationale Measurable

```text
❌ Bad: "Because it's fast"
✅ Good: "30% faster in benchmarks, lower learning curve"
```

### 4. Record Trade-offs

Every decision has costs. Document negative consequences, not just positive ones.

### 5. Review Regularly

ADRs are living documents. Update status regularly and deprecate old decisions.

## Related Commands

- `/adr:rule <number>` - Generate rule from ADR
- `/research` - Create ADR after technical research
- `/think` - Plan before major decisions

## References

- [MADR Official Site](https://adr.github.io/madr/)
- [Architecture Decision Records](https://adr.github.io/)

## Tips

1. **Record Early**: Document immediately after decision (while memory is fresh)
2. **Team Review**: Important decisions should be reviewed by team
3. **Keep Concise**: Long ADRs don't get read (aim for 1 page)
4. **Use Links**: Include links to related ADRs and external resources

## FAQ

**Q: When should I create an ADR?**
A: For important architecture decisions, technology selections, and design policy changes.

**Q: Should small decisions become ADRs?**
A: No. Only decisions that affect the entire team are necessary.

**Q: What if I want to change a past decision?**
A: Deprecate the existing ADR and create a new one.

**Q: Who should create ADRs?**
A: People involved in the decision, or those implementing it.
