---
name: integrating-storybook
description: >
  Skill for integrating Storybook with spec.md. Auto-generates Stories skeletons from Component API specifications.
  Use when working with Storybook, Stories, component specifications, or frontend component development.
  Covers CSF3 format, autodocs integration, Props-to-argTypes mapping, and component API templates.
  Essential for /think (Component API generation) and /code (Stories generation) commands.
allowed-tools: Read, Write, Glob, Grep
---

# Storybook Integration - Component API to Stories Generator

## Overview

Skill for integrating Storybook with Claude Code workflow. Covers:

1. **Component API Template** - Component specification template added to spec.md
2. **CSF3 Patterns** - Component Story Format 3 best practices
3. **Stories Generation** - Auto-generate Stories skeletons from spec.md

## When to Use This Skill

### Automatic Triggers

Keywords that activate this skill:

- storybook, stories
- component api, component specification
- props, argTypes, variants
- csf, csf3, autodocs
- frontend component

### Explicit Invocation

For guaranteed activation:

- "Apply storybook integration"
- "Generate stories from spec"
- "Add component API to spec.md"

### Common Scenarios

- `/think` for frontend feature planning → Component API section added
- `/code` for component implementation → Stories skeleton generated
- Standardizing component specifications
- Integration with Storybook autodocs

## Core Concepts

### 1. Component API Section in spec.md

Section added to spec.md when planning frontend features with `/think`.

**Location**: `### 4.x Component API: [ComponentName]` inside `## 4. UI Specification`

**Contents**:

- Props Interface (TypeScript)
- Variants (size, color, state)
- States (default, hover, disabled, loading)
- Usage Examples

### 2. Stories Generation

Auto-generated when `/code` is run and spec.md contains Component API section.

**Output**: `[ComponentName].stories.tsx`

**Format**: CSF3 + autodocs

### 3. Frontend Detection

Auto-detection from feature description:

```typescript
function shouldGenerateComponentAPI(feature: string): boolean {
  const frontendKeywords = [
    /component/i,
    /ui/i,
    /frontend/i,
    /button/i,
    /form/i,
    /modal/i,
    /dialog/i,
    /card/i,
    /list/i,
    /table/i,
  ];

  const backendKeywords = [
    /api endpoint/i,
    /database/i,
    /server/i,
    /backend/i,
    /cli/i,
    /migration/i,
  ];

  const hasFrontend = frontendKeywords.some(kw => kw.test(feature));
  const hasBackend = backendKeywords.some(kw => kw.test(feature));

  return hasFrontend && !hasBackend;
}
```

## Data Models

### ComponentSpec

```typescript
interface ComponentSpec {
  name: string;                    // Component name (PascalCase)
  description: string;             // Description
  props: PropDefinition[];         // Props definitions
  variants: VariantDefinition[];   // Variants
  examples: UsageExample[];        // Usage examples
}

interface PropDefinition {
  name: string;                    // Prop name
  type: string;                    // TypeScript type
  required: boolean;               // Is required
  defaultValue?: string;           // Default value
  description: string;             // Description
}

interface VariantDefinition {
  name: string;                    // Variant name (e.g., "size")
  options: string[];               // Options (e.g., ["sm", "md", "lg"])
  defaultOption: string;           // Default value
}

interface UsageExample {
  title: string;                   // Example title
  code: string;                    // JSX code
  description?: string;            // Description
}
```

## Templates

### Component API Template

See: [@./references/component-api-template.md]

### CSF3 Patterns

See: [@./references/csf3-patterns.md]

## Integration Points

### With Commands

- **/think** - Adds Component API section when frontend feature detected
- **/code** - Generates Stories from Component API section

### With Skills

- **frontend-patterns** - Integration with Container/Presentational patterns
- **tdd-test-generation** - Leverage Stories as tests

### Integration Method

```yaml
# In command YAML frontmatter
dependencies: [storybook-integration, frontend-patterns]
```

## Workflow

### /think → spec.md generation

```text
/think "Add Button component"
    ↓
shouldGenerateComponentAPI("Add Button component")
    ↓ YES
Add Component API section to spec.md:
    ## 4.x Component API: Button
    ### Props
    ### Variants
    ### States
    ### Usage Examples
```

### /code → Stories generation

```text
/code
    ↓
Component API section in spec.md?
    ↓ YES
parseComponentSpec(specContent)
    ↓
Existing Stories file?
    ├─ YES → Show integration strategy (O/S/M/D)
    └─ NO  → Generate with generateStoryTemplate(spec)
```

### Existing Stories Integration (EC-002)

Options when existing Stories file is found:

```markdown
[O] Overwrite - Completely replace existing file
[S] Skip - Keep existing file, do not generate
[M] Merge (manual) - Show diff, integrate manually
[D] Diff only - Append only new Stories
```

## Best Practices

### Do's

- Explicitly type Props
- Cover all variant options
- Include practical code in Usage Examples
- Leverage autodocs for automatic documentation

### Don'ts

- Don't include complex logic in Stories (use play function separately)
- Don't create Stories for all Props combinations (focus on representative ones)
- Avoid overusing decorators

## Quick Start

### 1. Plan frontend feature

```bash
/think "Add Button component with primary/secondary variants"
```

→ Component API section auto-added to spec.md

### 2. Implement component

```bash
/code
```

→ Button.tsx and Button.stories.tsx generated

### 3. Verify in Storybook

```bash
npm run storybook
```

→ Props documentation auto-generated via autodocs

## References

- [@./references/component-api-template.md] - Component API template
- [@./references/csf3-patterns.md] - CSF3 patterns reference
- [Storybook Docs](https://storybook.js.org/docs/writing-stories) - Official documentation

## Related Skills

- **frontend-patterns** - Component design patterns
- **tdd-test-generation** - Test-driven development

## Success Metrics

This skill is working when:

- Stories are auto-generated from spec.md
- Props and argTypes match
- Documentation is auto-generated via autodocs
- Component specifications are shared across team
