<!--
Golden Master: Spec - Storybook Integration

Selection criteria:
- Clear FR structure for frontend features
- Component API specification in spec format
- CSF3 Stories generation patterns

Features:
- Reference example for UI/component spec
- Trigger keywords definition
- Integration with /think workflow

Source: ~/.claude/workspace/planning/2025-12-14-storybook-integration/

Last Reviewed: 2025-12-17
Update Reason: Added maintenance metadata fields
Previous Version: N/A
-->

# Specification: Storybook Integration Feature

Version: 1.1.0
Based on: SOW v1.1.0
Last Updated: 2025-12-14 (Revised)

---

## 1. Functional Requirements

### 1.1 Skill Creation (storybook-integration)

[✓] FR-001: Skill file structure

- Location: `~/.claude/skills/integrating-storybook/`
- Structure:
  - `SKILL.md` - Main skill file
  - `references/csf3-patterns.md` - CSF3 pattern collection
  - `references/component-api-template.md` - API template

[✓] FR-002: Skill trigger keywords

- Keywords: storybook, stories, component api, component specification
- Auto-trigger: During frontend implementation

### 1.2 /think Extension

[✓] FR-003: Add Component API section to spec.md

- Location: Within Section 4 (UI Specification)
- Content:
  - Props Interface (TypeScript)
  - Variants (size, color, state)
  - Usage Examples

[→] FR-004: Automatic detection for Component API section

- Trigger condition: Feature description contains "component", "UI", "frontend"
- Skip condition: Backend, API, CLI implementation

### 1.3 /code Extension

[→] FR-005: Automatic Stories skeleton generation

- Trigger: Component API section exists in spec.md
- Output: `ComponentName.stories.tsx`
- Format: CSF3 + autodocs

[→] FR-006: Stories content

- Default Story
- Variants Stories (size, color, etc.)
- State Stories (loading, error, disabled, etc.)
- Auto-generated argTypes

### 1.4 Edge Cases

[→] EC-001: Component API section not found

- Action: Skip Stories generation
- Log: "Component API not found in spec.md, skipping Stories generation"

[→] EC-002: Existing Stories file found

- Action: Display overwrite confirmation
- Options: [O]verwrite, [S]kip, [M]erge (manual)

**Integration strategy details:**

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Existing Stories file detected

File: src/components/Button/Button.stories.tsx
Last modified: 2025-12-10 14:23
Stories count: 5 (Default, Primary, Secondary, Small, Large)

Planned Stories: 6 (Default, Primary, Secondary, Small, Large, Disabled)

Diff:
+ Disabled (new)
~ argTypes update (variant, size)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[O] Overwrite - Completely replace existing file
[S] Skip - Keep existing file, do not generate
[M] Merge (manual) - Display diff, manually integrate
[D] Diff only - Append only new Stories

Select (O/S/M/D):
```

**Decision criteria:**

- If existing Stories have custom logic (play functions, decorators, etc.) → [S] or [M] recommended
- If existing Stories were auto-generated → [O] recommended
- If only want to add new Stories → [D] recommended

**Migration path:**

1. Initial adoption: [S] to skip existing Stories
2. Gradual migration: Manually write Component API in spec.md → [O] to regenerate
3. Full migration: Define Component API for all components

---

## 2. Data Model

### 2.1 ComponentSpec

```typescript
interface ComponentSpec {
  name: string;                    // Component name (PascalCase)
  description: string;             // Description
  props: PropDefinition[];         // Props definition
  variants: VariantDefinition[];   // Variations
  examples: UsageExample[];        // Usage examples
}

interface PropDefinition {
  name: string;                    // Prop name
  type: string;                    // TypeScript type
  required: boolean;               // Required flag
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

---

## 3. UI Specification (Templates)

### 3.1 spec.md Component API Section Template

````markdown
### 4.x Component API: [ComponentName]

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| children | ReactNode | ✓ | - | Content to display |
| variant | 'primary' \| 'secondary' | - | 'primary' | Visual style |
| size | 'sm' \| 'md' \| 'lg' | - | 'md' | Size variant |
| disabled | boolean | - | false | Disable interactions |
| onClick | () => void | - | - | Click handler |

### Variants

**Size**
- `sm`: Small (32px height)
- `md`: Medium (40px height) - Default
- `lg`: Large (48px height)

**Variant**
- `primary`: Primary action style
- `secondary`: Secondary action style

### States

- `default`: Normal state
- `hover`: Mouse hover
- `active`: Being clicked
- `disabled`: Non-interactive
- `loading`: Async operation

### Usage Examples

```tsx
// Basic usage
<Button onClick={handleClick}>Click me</Button>

// With variants
<Button variant="secondary" size="lg">Large Secondary</Button>

// Disabled state
<Button disabled>Disabled</Button>
```
````

### 3.2 Generated Stories Template

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { [ComponentName] } from './[ComponentName]';

const meta: Meta<typeof [ComponentName]> = {
  title: 'Components/[ComponentName]',
  component: [ComponentName],
  tags: ['autodocs'],
  argTypes: {
    // Auto-generated from Props
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof [ComponentName]>;

// Default Story
export const Default: Story = {
  args: {
    children: '[ComponentName] Content',
  },
};

// Variant Stories
export const Primary: Story = {
  args: {
    ...Default.args,
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    ...Default.args,
    variant: 'secondary',
  },
};

// Size Stories
export const Small: Story = {
  args: {
    ...Default.args,
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    ...Default.args,
    size: 'lg',
  },
};

// State Stories
export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
  },
};
```

---

## 4. Dependencies

### 4.1 External Libraries

[✓] @storybook/react: ^7.0.0 (CSF3 support)
[→] @storybook/addon-docs: ^7.0.0 (autodocs support)

### 4.2 Internal Dependencies

[✓] ~/.claude/commands/think.md - Extension target
[✓] ~/.claude/commands/code.md - Extension target
[✓] ~/.claude/skills/applying-frontend-patterns/SKILL.md - Reference

---

## 5. Non-Functional Requirements

### 5.1 Performance

[✓] NFR-001: Stories generation time

- Target: < 2 seconds (single component)
- Measurement: spec.md load + template generation + file write
- Aligned with SOW Success Metrics

[→] NFR-002: spec.md parse time

- Target: < 500ms
- Scope: Component API section extraction

### 5.2 Maintainability

[✓] NFR-003: Generated code quality

- ESLint/Prettier compliant
- TypeScript strict mode compatible
- Easy to manually edit structure

[→] NFR-004: Template customizability

- Templates managed under `references/`
- Project-specific customization overridable via `.claude/CLAUDE.md`

### 5.3 Extensibility

[→] NFR-005: Consideration for other frameworks

- Current: React + CSF3 only
- Future: Design for Vue, Svelte extension
- Extension point: Abstract `generateStoryTemplate()`

[→] NFR-006: Support for other Storybook formats

- Current: CSF3 only
- Future: Consider CSF2, MDX extension
- Extension point: Template switching mechanism

---

## 6. Implementation Details

### 6.1 Modified Files

| File | Changes | Priority |
|------|---------|----------|
| `~/.claude/commands/think.md` | Add Component API section to spec.md template | Phase 2 |
| `~/.claude/commands/code.md` | Add Stories generation logic | Phase 3 |

### 6.2 New Files (Phase 1)

```text
~/.claude/skills/integrating-storybook/
├── SKILL.md                              # Main skill file
└── references/
    ├── csf3-patterns.md                  # CSF3 pattern collection
    └── component-api-template.md         # Component API template
```

### 6.3 New Functions

#### Defined within storybook-integration skill

```typescript
/**
 * Extract Component API section from spec.md
 * @param specContent - spec.md content
 * @returns ComponentSpec | null
 */
function parseComponentSpec(specContent: string): ComponentSpec | null

/**
 * Generate CSF3 format Stories from ComponentSpec
 * @param spec - Component specification
 * @returns Stories file content
 */
function generateStoryTemplate(spec: ComponentSpec): string

/**
 * Determine if feature description is frontend implementation
 * @param feature - Feature description string
 * @returns boolean
 */
function shouldGenerateComponentAPI(feature: string): boolean
```

### 6.4 /think.md Modification Points

**Addition location**: Within `## Specification Document (spec.md) Structure` section

```markdown
## 4. UI Specification (Frontend features)

### 4.1 [Screen/Component Name]
... (existing)

#### 4.x Component API: [ComponentName]  ← NEW
(Reference storybook-integration skill template)
```

**Detection logic addition location**: Analysis phase before SOW generation

```typescript
// Feature description analysis
const isFrontendFeature = shouldGenerateComponentAPI(featureDescription);

if (isFrontendFeature) {
  // Include Component API section in spec.md template
}
```

### 6.5 /code.md Modification Points

**Addition location**: After `## Specification Context (Auto-Detection)` section

```markdown
## Storybook Integration (Optional)

### Stories Generation

If spec.md contains Component API section:
1. Parse ComponentSpec from spec.md
2. Check for existing Stories file
3. Generate or update Stories based on user choice

### Trigger Condition
- `## 4.x Component API:` section exists in spec.md
- storybook-integration skill is enabled
```

### 6.6 Process Flow Diagram

```text
/think execution
    ↓
shouldGenerateComponentAPI(feature)?
    ├─ YES → Add Component API section to spec.md
    └─ NO  → Normal spec.md generation

/code execution
    ↓
Component API section in spec.md?
    ├─ YES → Parse with parseComponentSpec()
    │         ↓
    │   Existing Stories file?
    │         ├─ YES → Display EC-002 integration strategy
    │         └─ NO  → Generate with generateStoryTemplate()
    └─ NO  → Normal implementation flow
```

---

## 7. Test Scenarios

### 7.1 Unit Tests

```typescript
describe('storybook-integration', () => {
  describe('parseComponentSpec', () => {
    it('[✓] extracts component spec from spec.md', () => {
      // Given: spec.md with Component API section
      const specContent = `## 4.1 Component API: Button\n...`;

      // When: parsing the spec
      const result = parseComponentSpec(specContent);

      // Then: component spec is extracted
      expect(result.name).toBe('Button');
      expect(result.props).toHaveLength(5);
    });

    it('[→] returns null if no Component API section', () => {
      // Given: spec.md without Component API
      const specContent = `## 4.1 Screen Layout\n...`;

      // When: parsing the spec
      const result = parseComponentSpec(specContent);

      // Then: null returned
      expect(result).toBeNull();
    });
  });

  describe('generateStoryTemplate', () => {
    it('[✓] generates CSF3 format story', () => {
      // Given: component spec
      const spec: ComponentSpec = {
        name: 'Button',
        props: [...],
        variants: [...],
      };

      // When: generating story
      const story = generateStoryTemplate(spec);

      // Then: valid CSF3 format
      expect(story).toContain("import type { Meta, StoryObj }");
      expect(story).toContain("tags: ['autodocs']");
    });
  });
});
```

### 7.2 Integration Tests

```typescript
describe('/think with storybook-integration', () => {
  it('[→] includes Component API section for frontend features', async () => {
    // Given: frontend feature description
    const feature = "Add Button component with variants";

    // When: running /think
    await runThinkCommand(feature);

    // Then: spec.md contains Component API
    const spec = readSpec();
    expect(spec).toContain('## 4.');
    expect(spec).toContain('Component API');
  });
});

describe('/code with storybook-integration', () => {
  it('[→] generates stories when Component API exists', async () => {
    // Given: spec.md with Component API
    // When: running /code
    // Then: Button.stories.tsx is created
  });
});
```

---

## 8. Known Issues & Assumptions

### Assumptions (→)

1. [→] Using Storybook 7+ - CSF3 format assumed
2. [→] React + TypeScript project
3. [→] autodocs addon enabled

### Unknown / Need Verification (?)

1. [?] Specific Storybook version
2. [?] Existing project's Stories structure
3. [?] Presence of design system / design tokens

---

## 9. Implementation Checklist

### Phase 1: Skill Creation

- [ ] Create `~/.claude/skills/integrating-storybook/SKILL.md`
- [ ] Create `references/csf3-patterns.md`
- [ ] Create `references/component-api-template.md`

### Phase 2: /think Extension

- [ ] Add Component API section to spec.md template
- [ ] Add frontend detection logic
- [ ] Integrate with existing UI Specification section

### Phase 3: /code Extension

- [ ] ComponentSpec extraction logic from spec.md
- [ ] Stories template generation logic
- [ ] Existing file detection/confirmation logic

### Phase 4: Verification

- [ ] Test in real project
- [ ] Update documentation
- [ ] Sync Japanese documentation

---

## 10. References

- SOW: `sow.md`
- Related: `~/.claude/skills/applying-frontend-patterns/SKILL.md`
- Storybook Docs: <https://storybook.js.org/docs/writing-stories>
