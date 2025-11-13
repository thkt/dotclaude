---
description: >
  Generate project rules from ADR automatically and integrate with CLAUDE.md. Converts decision into AI-executable format.
  Saves to docs/rules/, auto-integrates with .claude/CLAUDE.md. Enables AI to follow project-specific decisions.
  Use when ADR decision should affect AI behavior and enforce project-specific patterns.
  ADRからプロジェクトルールを自動生成し、CLAUDE.mdに統合。決定内容をAI実行可能形式に変換。
allowed-tools: Read, Write, Edit, Bash(ls:*), Bash(cat:*), Grep, Glob
model: inherit
argument-hint: "[ADR number]"
---

# /adr:rule - Generate Rule from ADR

## Purpose

Analyze the specified ADR (Architecture Decision Record) and automatically convert it into AI-executable rule format. Generated rules are automatically appended to the project's `.claude/CLAUDE.md` and will be reflected in subsequent AI operations.

## Usage

```bash
/adr:rule <ADR-number>
```

**Examples:**

```bash
/adr:rule 0001
/adr:rule 12
/adr:rule 0003
```

## Execution Flow

### 1. Read ADR File

```bash
# Zero-pad ADR number
ADR_NUM=$(printf "%04d" $1)

# Find ADR file
ADR_FILE=$(ls docs/adr/${ADR_NUM}-*.md 2>/dev/null | head -1)

# Check if file exists
if [ -z "$ADR_FILE" ]; then
  echo "❌ Error: ADR-${ADR_NUM} not found"
  exit 1
fi
```

### 2. Parse ADR Content

Use Read tool to load ADR file and extract the following sections:

- **Title**: Basis for rule name
- **Decision Outcome**: Core of the rule
- **Rationale**: Why this rule is needed
- **Consequences (Positive/Negative)**: Considerations when applying rule

**Parsing example:**

```markdown
# Input ADR (0001-typescript-strict-mode.md)
Title: Adopt TypeScript strict mode
Decision: Enable TypeScript strict mode
Rationale: Improve type safety, early bug detection

↓ Analysis

Rule Name: TYPESCRIPT_STRICT_MODE
Priority: P2 (Development Rule)
Application: When writing TypeScript code
Instructions: Always write in strict mode, avoid any
```

### 3. Generate Rule Filename

```bash
# Convert title to UPPER_SNAKE_CASE
# Example: "Adopt TypeScript strict mode" → "TYPESCRIPT_STRICT_MODE"

RULE_NAME=$(echo "$TITLE" | \
  tr '[:lower:]' '[:upper:]' | \
  sed 's/ /_/g' | \
  sed 's/[^A-Z0-9_]//g' | \
  sed 's/__*/_/g')

RULE_FILE="docs/rules/${RULE_NAME}.md"
```

### 4. Generate Rule File

````markdown
# [Rule Name]

Priority: P2
Source: ADR-[number]
Created: [YYYY-MM-DD]

## Application Conditions

[When to apply this rule - derived from ADR "Decision Outcome"]

## Execution Instructions

[Specific instructions for AI - generated from ADR "Decision Outcome" and "Rationale"]

### Requirements

- [Must do item 1]
- [Must do item 2]

### Prohibitions

- [Must NOT do item 1]
- [Must NOT do item 2]

## Examples

### ✅ Good Example

```[language]
[Code example following ADR decision]
```

### ❌ Bad Example

```[language]
[Pattern to avoid]
```

## Background

[Quoted from ADR "Context and Problem Statement"]

## Expected Benefits

[Quoted from ADR "Positive Consequences"]

## Caveats

[Quoted from ADR "Negative Consequences"]

## References

- ADR: [relative path]
- Created: [YYYY-MM-DD]
- Last Updated: [YYYY-MM-DD]

---

*This rule was automatically generated from ADR-[number]*
````

### 5. Integrate with CLAUDE.md

Automatically append reference to project's `.claude/CLAUDE.md`:

```bash
# Check if .claude/CLAUDE.md exists
if [ ! -f ".claude/CLAUDE.md" ]; then
  # Create if doesn't exist
  mkdir -p .claude
  cat > .claude/CLAUDE.md << 'EOF'
# CLAUDE.md

## Project Rules

Project-specific rules.

EOF
fi

# Check existing references (avoid duplicates)
if ! grep -q "docs/rules/${RULE_NAME}.md" .claude/CLAUDE.md; then
  # Append after "## Project Rules" section
  # Or create new section
fi
```

**Append format:**

```markdown
## Project Rules

Generated from ADR:

- **[Rule Name]**: [@docs/rules/[RULE_NAME].md](docs/rules/[RULE_NAME].md) (ADR-[number])
```

### 6. Completion Message

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Rule Generated

📄 ADR: docs/adr/0001-typescript-strict-mode.md
📋 Rule: docs/rules/TYPESCRIPT_STRICT_MODE.md
🔗 Integrated: .claude/CLAUDE.md (updated)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Generated Rule

**Rule Name:** TYPESCRIPT_STRICT_MODE
**Priority:** P2
**Application:** When writing TypeScript code

### Execution Instructions

- Always enable TypeScript strict mode
- Avoid using any, use proper type definitions
- Prioritize type-safe implementation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This rule will be automatically applied from next AI execution.
```

## Rule Generation Logic

### Automatic Priority Determination

Determine priority automatically from ADR content:

| Condition | Priority | Example |
|-----------|----------|---------|
| Security-related | P0 | Authentication, Authorization |
| Language/Framework settings | P1 | TypeScript strict, Linter config |
| Development process | P2 | Commit conventions, Code review |
| Recommendations | P3 | Performance optimization |

**Determination logic:**

```javascript
if (title.includes('security') || title.includes('auth')) {
  priority = 'P0';
} else if (title.includes('TypeScript') || title.includes('config')) {
  priority = 'P1';
} else if (title.includes('process') || title.includes('convention')) {
  priority = 'P2';
} else {
  priority = 'P3';
}
```

### Generate Execution Instructions

Extract specific execution instructions from ADR "Decision Outcome" and "Rationale":

**Conversion examples:**

| ADR Content | Generated Execution Instruction |
|-------------|----------------------------------|
| "Enable TypeScript strict mode" | "Always write code in strict mode" |
| "Use Auth.js for authentication" | "Use Auth.js library for authentication, avoid custom implementations" |
| "Monorepo structure" | "Clarify dependencies between packages, place common code in shared package" |

### Extract Requirements and Prohibitions

Derived from ADR "Rationale" and "Consequences":

**Requirements (Must do):**

- Positive parts of decision content
- Specific actions to implement

**Prohibitions (Must NOT):**

- Anti-patterns to avoid
- Actions leading to negative consequences

### Generate Code Examples

Automatically generate good and bad examples based on ADR technical content:

````markdown
// TypeScript strict mode example

### ✅ Good Example

```typescript
// Clear type definition
interface User {
  id: number;
  name: string;
}

function getUser(id: number): User {
  // implementation
}
```

### ❌ Bad Example

```typescript
// Using any
function getUser(id: any): any {
  // implementation
}
```
````

## Error Handling

### 1. ADR Not Found

```text
❌ Error: ADR-0001 not found

Check docs/adr/ directory:
ls docs/adr/

Available ADRs:
- 0002-use-react-query.md
- 0003-monorepo-structure.md

Specify correct number:
/adr:rule 0002
```

### 2. Invalid Number Format

```text
❌ Error: Invalid ADR number "abc"

ADR number must be numeric:

Correct examples:
/adr:rule 1
/adr:rule 0001
/adr:rule 12

Wrong examples:
/adr:rule abc
/adr:rule one
```

### 3. Failed to Create docs/rules/ Directory

```text
❌ Error: Cannot create docs/rules/ directory

Check permissions:
ls -la docs/

Or create manually:
mkdir -p docs/rules
chmod +w docs/rules
```

### 4. CLAUDE.md Not Found

```text
⚠️  Warning: .claude/CLAUDE.md not found

Create new file? (Y/n)
> Y

✅ Created .claude/CLAUDE.md
✅ Added rule reference
```

### 5. Rule File Already Exists

```text
⚠️  Warning: docs/rules/TYPESCRIPT_STRICT_MODE.md already exists

Overwrite? (y/N)
> n

❌ Cancelled

To review existing rule:
cat docs/rules/TYPESCRIPT_STRICT_MODE.md
```

## CLAUDE.md Integration Patterns

### For New Projects

```markdown
# CLAUDE.md

## Project Rules

Project-specific rules.

### Architecture Decisions

Generated from ADR:

- **TYPESCRIPT_STRICT_MODE**: [@docs/rules/TYPESCRIPT_STRICT_MODE.md] (ADR-0001)
```

### For Existing CLAUDE.md

```markdown
# CLAUDE.md

## Existing Section
[Existing content]

## Project Rules

[Existing rules]

### Architecture Decisions

Generated from ADR:

- **TYPESCRIPT_STRICT_MODE**: [@docs/rules/TYPESCRIPT_STRICT_MODE.md] (ADR-0001)
- **REACT_QUERY_USAGE**: [@docs/rules/REACT_QUERY_USAGE.md] (ADR-0002)
```

**Duplicate check:**

```bash
# Check if same rule is already added
if grep -q "docs/rules/${RULE_NAME}.md" .claude/CLAUDE.md; then
  echo "⚠️  This rule is already added"
  exit 0
fi
```

## Usage Examples

### Example 1: Convert TypeScript Config to Rule

```bash
# Step 1: Create ADR
/adr "Adopt TypeScript strict mode"

# Step 2: Generate rule
/adr:rule 0001
```

**Generated rule (`docs/rules/TYPESCRIPT_STRICT_MODE.md`):**

````markdown
# TYPESCRIPT_STRICT_MODE

Priority: P1
Source: ADR-0001
Created: 2025-10-01

## Application Conditions

Apply to all files when writing TypeScript code

## Execution Instructions

### Requirements

- Set `strict: true` in `tsconfig.json`
- Avoid using `any` type, use proper type definitions
- Leverage type inference, explicit type annotations only where necessary
- Clearly distinguish between `null` and `undefined`

### Prohibitions

- Easy use of `any` type
- Overuse of `@ts-ignore` comments
- Excessive use of type assertions (`as`)

## Examples

### ✅ Good Example

```typescript
interface User {
  id: number;
  name: string;
  email: string | null;
}

function getUser(id: number): User | undefined {
  // implementation
}
```

### ❌ Bad Example

```typescript
function getUser(id: any): any {
  // @ts-ignore
  return data;
}
```

## Background

Aim to improve type safety and early bug detection.
Reddit codebase is becoming complex and needs protection through types.

## Expected Benefits

- Compile-time error detection
- Improved IDE completion
- Safer refactoring

## Caveats

- Migrating existing code takes time (apply gradually)
- Higher learning curve for beginners

## References

- ADR: docs/adr/0001-typescript-strict-mode.md
- Created: 2025-10-01
- Last Updated: 2025-10-01

---

*This rule was automatically generated from ADR-0001*
````

### Example 2: Convert Authentication Rule

```bash
/adr "Use Auth.js for authentication"
/adr:rule 0002
```

### Example 3: Convert Architecture Rule

```bash
/adr "Introduce Turborepo for monorepo"
/adr:rule 0003
```

## Best Practices

### 1. Generate Rules Immediately After ADR Creation

```bash
# Don't forget to convert decision to rule immediately
/adr "New decision"
/adr:rule [number]  # Execute without forgetting
```

### 2. Regular Rule Reviews

```bash
# Periodically check rules
ls -la docs/rules/

# Review old rules
cat docs/rules/*.md
```

### 3. Team Sharing

```bash
# Include rule files in git management
git add docs/rules/*.md .claude/CLAUDE.md
git commit -m "docs: add architecture decision rules"
```

### 4. Rule Updates

When ADR is updated, regenerate the rule:

```bash
# Update ADR
vim docs/adr/0001-typescript-strict-mode.md

# Regenerate rule
/adr:rule 0001  # Confirm overwrite
```

## Related Commands

- `/adr [title]` - Create ADR
- `/research` - Technical research
- `/review` - Review rule application

## Tips

1. **Convert Immediately**: Execute right after ADR creation so decisions aren't forgotten
2. **Verify Priority**: After generation, check rule file to verify appropriate priority
3. **Confirm CLAUDE.md**: Test AI behavior after integration to verify reflection
4. **Team Agreement**: Review with team before converting to rule

## FAQ

**Q: Is rule generation completely automatic?**
A: Yes, it automatically generates rules from ADR and integrates with CLAUDE.md.

**Q: Can generated rules be edited?**
A: Yes, you can directly edit files in `docs/rules/`.

**Q: What if I want to delete a rule?**
A: Delete the rule file and manually remove reference from CLAUDE.md.

**Q: Can I create one rule from multiple ADRs?**
A: Currently 1:1 correspondence. If you want to combine multiple ADRs, create rule manually.

**Q: What if AI doesn't recognize the rule?**
A: Check that reference path in `.claude/CLAUDE.md` is correct. Relative paths are important.
