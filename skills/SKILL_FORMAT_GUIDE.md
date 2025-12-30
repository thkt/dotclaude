# Skill Format Guide - Official Specification

Official format guide for Claude Code Skills based on <https://code.claude.com/docs/en/skills>

## Quick Reference

### Required Fields

```yaml
---
name: skill-name  # lowercase, hyphens, max 64 chars
description: >
  Brief summary with trigger keywords included.
  Maximum 1024 characters.
allowed-tools:  # Optional but recommended
  - Read
  - Write
---
```

## Official Specification

### YAML Front Matter

#### `name` (Required)

- **Format**: Lowercase letters, numbers, hyphens only
- **Max length**: 64 characters
- **Examples**:
  - [Good] `creating-adrs`
  - [Good] `optimizing-performance`
  - [Bad] `ADR Creator` (spaces, uppercase)
  - [Bad] `adr_creator` (underscores not preferred)

---

## Naming Conventions (Anthropic公式Best Practices準拠)

### Recommended: Gerund Form (動詞-ing形式)

Skill names should use gerund form to clearly describe the activity:

**Recommended examples**:

- `processing-pdfs`
- `analyzing-spreadsheets`
- `managing-databases`
- `testing-code`
- `writing-documentation`

**Current skill examples**:

| Gerund Form | Meaning |
| --- | --- |
| `creating-adrs` | ADRを作成する |
| `optimizing-performance` | パフォーマンスを最適化する |
| `reviewing-security` | セキュリティをレビューする |
| `generating-tdd-tests` | TDDテストを生成する |

### Acceptable: Noun Phrases

Alternative naming is acceptable:

- `pdf-processing`
- `spreadsheet-analysis`
- `database-management`

### Avoid

- Vague names: `helper`, `utils`, `tools`
- Overly generic: `documents`, `data`, `files`
- Reserved words: `anthropic-helper`, `claude-tools`

### Name Field Requirements

- Maximum 64 characters
- Lowercase letters, numbers, and hyphens only
- No XML tags
- No reserved words ("anthropic", "claude")

---

## Description Requirements (Anthropic公式Best Practices準拠)

### Format Rules

1. **Third Person Only** (三人称のみ)
   - [Good] Good: "Processes Excel files and generates reports"
   - [Good] Good: "Extracts text from PDF documents"
   - [Bad] Avoid: "I can help you process Excel files"
   - [Bad] Avoid: "You can use this to process files"

2. **Character Limit**: Maximum 1024 characters

3. **Content Requirements**:
   - **What**: Describe what the skill does
   - **When**: Specify when to use it (triggers/contexts)

4. **Prohibited Content**:
   - XML tags
   - Reserved words: "anthropic", "claude"

### Example

```yaml
description: |
  Extracts text and tables from PDF files, fills forms, and merges documents.
  Use when working with PDF files or when the user mentions PDFs, forms,
  or document extraction.
```

### Trigger Keywords in Description

Include trigger keywords explicitly:

```yaml
description: >
  Comprehensive TDD guide with RGRC cycle and test design techniques.
  Use when implementing TDD (テスト駆動開発), discussing Red-Green-Refactor,
  Baby Steps, test generation (テスト生成), or unit testing (ユニットテスト).
  Provides systematic test case generation and SOW integration.
```

---

#### `description` (Required)

- **Purpose**: Critical for Claude to discover when to use the Skill
- **Max length**: 1024 characters
- **Content**: Should include:
  1. Brief functional summary
  2. Trigger keywords explicitly listed
  3. Key capabilities or use cases
- **Format**: Use `>` for multi-line YAML string
- **Examples**:

  ```yaml
  description: >
    Brief one-line summary of functionality.
    Triggers on keywords: "keyword1", "keyword2", "キーワード".
    Provides specific capabilities and use cases.
  ```

#### `allowed-tools` (Optional, Recommended)

- **Purpose**: Restricts Claude to specified tools
- **Format**: YAML array
- **Common tools**:
  - `Read`, `Write`, `Edit`
  - `Grep`, `Glob`
  - `Bash`, `Task`
  - `mcp__*` (MCP server tools)
- **Best practice**: Always specify explicitly
- **Example**:

  ```yaml
  allowed-tools:
    - Read
    - Write
    - Grep
    - Glob
    - Task
  ```

### Non-Official Fields

**Important**: Fields not in official spec may not function as expected.

**Do NOT use these fields**:

- `version`, `author`
- `triggers`, `sections`, `patterns`
- `context_size`, `full_size`
- `tokens`, `metadata`

**Reason**: These are not part of the official specification and will be ignored by Claude Code.

### Trigger Keywords in Description

Since `triggers` field is non-official, include all trigger keywords directly in `description`:

```yaml
description: >
  Main functionality description.
  Triggers on keywords: "keyword1", "keyword2", "キーワード1", "キーワード2",
  "pattern matching", "specific term", "technical jargon".
  Additional context and use cases.
```

**Tips**:

- Include both English and Japanese keywords if applicable
- List 10-20 most important keywords
- Include common user phrases
- Add technical terms and acronyms

## Directory Structure

### Single-File Skill

```text
skill-name/
└── SKILL.md (required)
```

**Use when**: Skill has minimal requirements

### Multi-File Skill (Recommended)

```text
skill-name/
├── SKILL.md (required)
├── sections/ (optional)
│   ├── section1.md
│   └── section2.md
├── templates/ (optional)
│   └── template.md
└── scripts/ (optional)
    └── script.sh
```

**Use when**: Skill needs supplementary documentation or utility scripts

**Progressive Disclosure**: Claude reads supplementary files only when needed, managing context efficiently.

## Bilingual Skills (EN/JP)

### Structure

```text
~/.claude/
├── skills/
│   └── skill-name/
│       └── SKILL.md (English)
└── ja/
    └── skills/
        └── skill-name/
            └── SKILL.md (Japanese)
```

### Synchronization

- **Same structure**: EN and JP must match
- **Same content**: Translated, but structurally identical
- **Same YAML**: `name` and `allowed-tools` identical
- **description**: Translated, but same trigger keywords

## Best Practices

### 1. Keep Focus Narrow

- [Good] One Skill = One capability
- [Bad] Avoid multi-purpose "Swiss Army knife" skills

**Example**:

- [Good] `readability-review` - Code readability only
- [Bad] `code-review` - Too broad (readability + security + performance)

### 2. Write Specific Descriptions

- [Good] Include functionality AND trigger terms
- [Bad] Vague terms like "helps with documents"

**Example**:

```yaml
# Bad: Vague
description: >
  Helps improve code quality.

# Good: Specific
description: >
  Code readability review based on "The Art of Readable Code".
  Triggers on keywords: "readability", "可読性", "naming", "命名",
  "complexity", "複雑", "Miller's Law", "ミラーの法則".
  Detects readability issues and suggests improvements.
```

### 3. Test with Teammates

- Validate Skills activate appropriately
- Confirm trigger keywords work as expected
- Ensure description clarity

### 4. Document Versions

- Add version history in Skill body (not YAML)
- Track changes in comments
- Update `description` when behavior changes

**Example**:

```markdown
# Skill Name

## Version History

- **2.0.0** (2025-01-15): Migrated to section-based structure
- **1.1.0** (2024-12-10): Added advanced trigger keywords
- **1.0.0** (2024-11-01): Initial release
```

### 5. Context Efficiency (from official skill-creator)

**Principle**: "The context window is a public good"

- [Good] Keep SKILL.md concise (< 500 lines recommended)
- [Good] Move detailed content to `references/` or `sections/`
- [Good] Avoid explaining what Claude already knows
- [Bad] Don't repeat general programming knowledge

**Progressive Loading**:

| Stage | Content | When Loaded |
| --- | --- | --- |
| 1. Metadata | name + description | Always (for discovery) |
| 2. SKILL.md | Core instructions | When skill activates |
| 3. References | Detailed guides | On explicit reference |

### 6. Flexibility Levels (from official skill-creator)

Match instruction specificity to error risk:

| Level | Format | Use When |
| --- | --- | --- |
| **High flexibility** | Text instructions | Multiple approaches valid |
| **Medium** | Pseudocode / parameters | Some structure needed |
| **Low flexibility** | Specific scripts | Errors are costly |

**Example**:

```markdown
# High flexibility (creative tasks)
"Generate a component that displays user data attractively"

# Low flexibility (error-prone tasks)
"Execute: scripts/generate-adr.sh --format=madr --number=auto"
```

### 7. Anti-Patterns: Files to Avoid

**Do NOT include these files** in skill directories:

- [Bad] `README.md` - Use SKILL.md for all documentation
- [Bad] `INSTALLATION_GUIDE.md` - Not needed for AI agents
- [Bad] `QUICK_REFERENCE.md` - Merge into SKILL.md
- [Bad] `CHANGELOG.md` - Use inline version history

**Reason**: Skills should only contain information needed for AI execution.
Human-oriented documentation belongs elsewhere.

## Common Patterns

### Pattern 1: Section-Based Skill

**Use case**: Large skill with multiple specialized areas

```yaml
---
name: performance-optimization
description: >
  Frontend performance optimization with React, Web Vitals, bundle optimization.
  Triggers on keywords: "パフォーマンス", "performance", "遅い", "slow",
  "最適化", "optimization", "LCP", "FID", "CLS", "bundle size".
  Includes sections on Web Vitals, React optimization, and bundle strategies.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
---

# Performance Optimization

## Section-Based Content

This skill is organized into 3 specialized sections:

### Section 1: Web Vitals
**File**: [`sections/web-vitals.md`](./sections/web-vitals.md)
**Focus**: LCP, FID, CLS optimization

### Section 2: React Optimization
**File**: [`sections/react-optimization.md`](./sections/react-optimization.md)
**Focus**: Re-render reduction, memoization

### Section 3: Bundle Optimization
**File**: [`sections/bundle-optimization.md`](./sections/bundle-optimization.md)
**Focus**: Code splitting, tree shaking
```

### Pattern 2: Template-Based Skill

**Use case**: Skill that generates files from templates

```yaml
---
name: adr-creator
description: >
  Architecture Decision Record creator with MADR format templates.
  Triggers on keywords: "ADR", "Architecture Decision", "決定記録",
  "技術選定", "create ADR", "document decision".
  6-phase process: validation, template selection, reference collection.
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
---

# ADR Creator

## Available Templates

- `templates/technology-selection.md`
- `templates/architecture-pattern.md`
- `templates/default.md`
```

### Pattern 3: Workflow Automation Skill

**Use case**: Project-specific automation

```yaml
---
name: esa-daily-report
description: >
  Automatic daily report creator for esa.io with Google Calendar integration.
  Triggers on keywords: "日報", "daily report", "振り返り", "reflection",
  "今日の記録", "today's summary", "esa".
  Streamlines daily reporting by auto-fetching calendar events.
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
---

# esa Daily Report Creator

## Configuration

Default settings in skill body or external config file.
```

## Validation Checklist

Before committing a Skill:

### YAML Front Matter

- [ ] `name` is lowercase with hyphens only
- [ ] `name` is ≤ 64 characters
- [ ] `description` is ≤ 1024 characters
- [ ] `description` includes trigger keywords
- [ ] `allowed-tools` is specified (recommended)
- [ ] No non-official fields (`version`, `triggers`, etc.)

### Content

- [ ] Skill has clear, narrow focus
- [ ] Instructions are step-by-step
- [ ] Examples demonstrate usage
- [ ] Related files referenced correctly

### Bilingual (if applicable)

- [ ] Japanese version exists
- [ ] Structure matches English version
- [ ] YAML fields are synchronized
- [ ] All trigger keywords translated

### Testing

- [ ] Skill activates on expected keywords
- [ ] Tools function as allowed
- [ ] No errors in Claude Code

## Migration Guide

### From Non-Official Format

If you have Skills with non-official fields:

1. **Remove non-official fields** from YAML:

   ```diff
   ---
   name: skill-name
   description: >
     ...
   - version: 1.0.0
   - triggers:
   -   keywords: [...]
   allowed-tools:
     - Read
   ---
   ```

2. **Move trigger keywords to `description`**:

   ```yaml
   description: >
     Main functionality.
     Triggers on keywords: "keyword1", "keyword2", "キーワード".
   ```

3. **Document sections in body** (if using section-based structure):

   ```markdown
   ## Section-Based Content

   - Section 1: [sections/section1.md](./sections/section1.md) - Description
   - Section 2: [sections/section2.md](./sections/section2.md) - Description
   ```

4. **Keep directory structure**:
   - `sections/`, `templates/`, etc. are still valid
   - Only YAML front matter needs updating

## Related Documentation

- [Official Skills Guide](https://code.claude.com/docs/en/skills)
- [Skills vs Slash Commands](https://code.claude.com/docs/en/slash-commands#skills-vs-slash-commands)
- [Plugins (Plugin Skills)](https://code.claude.com/docs/en/plugins)

---

**Last Updated**: 2025-11-12
**Based on**: Claude Code Official Documentation (<https://code.claude.com/docs/en/skills>)
