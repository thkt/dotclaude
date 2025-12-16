# Storybook Integration (Optional)

This module handles automatic Stories generation from spec.md Component API sections.

## Automatic Stories Generation

When spec.md contains a **Component API section** (`### 4.x Component API:`), automatically generate Stories.

**Trigger Condition**:

- spec.md contains `### 4.x Component API:` section
- References storybook-integration skill

**Process**:

1. Parse ComponentSpec from spec.md
2. Check for existing Stories file
3. Generate or update based on user choice

## Stories Generation Flow

```text
Component API section in spec.md?
    ├─ YES → parseComponentSpec()
    │         ↓
    │   Existing Stories file?
    │         ├─ YES → Show integration strategy (EC-002)
    │         └─ NO  → generateStoryTemplate()
    └─ NO  → Normal implementation flow (skip)
             Log: "Component API not found in spec.md, skipping Stories generation"
```

## Existing Stories Integration (EC-002)

Options when existing Stories file is found:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Existing Stories file detected

File: [path/to/Component.stories.tsx]
Stories count: [count]

[O] Overwrite - Completely replace existing file
[S] Skip - Keep existing file, do not generate
[M] Merge (manual) - Show diff, integrate manually
[D] Diff only - Append only new Stories

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Generated Stories Format (CSF3)

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta: Meta<typeof ComponentName> = {
  title: 'Components/ComponentName',
  component: ComponentName,
  tags: ['autodocs'],
  argTypes: {
    // Auto-generated from Props table
  },
};

export default meta;
type Story = StoryObj<typeof ComponentName>;

export const Default: Story = { args: { /* from Usage Examples */ } };
// Variant Stories...
// State Stories...
```

## Full Template

See: [@~/.claude/skills/storybook-integration/SKILL.md] for complete template and advanced options.
