# CSF3 Patterns - Component Story Format 3 Best Practices

## Overview

Pattern reference for Component Story Format 3 (CSF3) adopted in Storybook 7+.
Referenced during Stories auto-generation.

## Basic Structure

### Minimal Story

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};
```

### Full Story with Tags and ArgTypes

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
      description: 'Visual style variant',
      table: {
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Disable interactions',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    onClick: {
      action: 'clicked',
      description: 'Click handler',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;
```

## Story Patterns

### 1. Default Story

Simplest default state.

```tsx
export const Default: Story = {
  args: {
    children: 'Button',
  },
};
```

### 2. Variant Stories

Define each variant individually.

```tsx
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

export const Ghost: Story = {
  args: {
    ...Default.args,
    variant: 'ghost',
  },
};
```

### 3. Size Stories

Size variations.

```tsx
export const Small: Story = {
  args: {
    ...Default.args,
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    ...Default.args,
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    ...Default.args,
    size: 'lg',
  },
};
```

### 4. State Stories

Component states.

```tsx
export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    loading: true,
  },
};
```

### 5. Composition Stories

Combining multiple components.

```tsx
export const WithIcon: Story = {
  args: {
    ...Default.args,
    icon: <IconPlus />,
  },
};

export const IconOnly: Story = {
  args: {
    icon: <IconPlus />,
    'aria-label': 'Add item',
  },
};
```

## Advanced Patterns

### Play Function (Interaction Testing)

```tsx
import { within, userEvent, expect } from '@storybook/test';

export const ClickInteraction: Story = {
  args: {
    children: 'Click me',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    await userEvent.click(button);
    await expect(button).toHaveFocus();
  },
};
```

### Decorators

```tsx
export const WithDarkBackground: Story = {
  args: Default.args,
  decorators: [
    (Story) => (
      <div style={{ backgroundColor: '#1a1a1a', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
};
```

### Parameters

```tsx
export const CustomLayout: Story = {
  args: Default.args,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
};
```

## ArgTypes Reference

### Control Types

```tsx
argTypes: {
  // Select
  variant: {
    control: 'select',
    options: ['primary', 'secondary'],
  },

  // Radio
  size: {
    control: 'radio',
    options: ['sm', 'md', 'lg'],
  },

  // Boolean
  disabled: {
    control: 'boolean',
  },

  // Text
  label: {
    control: 'text',
  },

  // Number
  count: {
    control: { type: 'number', min: 0, max: 100, step: 1 },
  },

  // Range
  opacity: {
    control: { type: 'range', min: 0, max: 1, step: 0.1 },
  },

  // Color
  color: {
    control: 'color',
  },

  // Date
  date: {
    control: 'date',
  },

  // Object
  style: {
    control: 'object',
  },

  // Action
  onClick: {
    action: 'clicked',
  },
}
```

### Table Configuration

```tsx
argTypes: {
  variant: {
    control: 'select',
    options: ['primary', 'secondary'],
    description: 'Visual style of the button',
    table: {
      type: { summary: "'primary' | 'secondary'" },
      defaultValue: { summary: 'primary' },
      category: 'Appearance',
    },
  },
}
```

## Generated Template

Template generated from Component API in spec.md:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ${ComponentName} } from './${ComponentName}';

const meta: Meta<typeof ${ComponentName}> = {
  title: 'Components/${ComponentName}',
  component: ${ComponentName},
  tags: ['autodocs'],
  argTypes: {
${argTypes}
  },
};

export default meta;
type Story = StoryObj<typeof ${ComponentName}>;

// Default Story
export const Default: Story = {
  args: {
${defaultArgs}
  },
};

// Variant Stories
${variantStories}

// State Stories
${stateStories}
```

## Type Mapping

Conversion rules from Props types to argTypes:

| TypeScript Type | argTypes control |
|----------------|------------------|
| `string` | `control: 'text'` |
| `number` | `control: 'number'` |
| `boolean` | `control: 'boolean'` |
| `'a' \| 'b' \| 'c'` | `control: 'select', options: ['a', 'b', 'c']` |
| `ReactNode` | `control: 'text'` |
| `() => void` | `action: 'actionName'` |
| `Date` | `control: 'date'` |

## Best Practices

### Do's

1. **Use autodocs** - `tags: ['autodocs']` for auto documentation
2. **Base on Default** - Other Stories spread `...Default.args`
3. **Write descriptions** - Add explanations to argTypes
4. **Use actions** - Record event handlers with `action: 'name'`

### Don'ts

1. **Don't over-create Stories** - Focus on representative ones
2. **Avoid complex logic** - Don't put business logic in Stories
3. **Avoid hardcoded values** - Use args for external control
4. **Don't replace tests** - Stories are for visual verification, tests are separate

## References

- [Storybook CSF3 Migration](https://storybook.js.org/docs/migration-guide)
- [Writing Stories](https://storybook.js.org/docs/writing-stories)
- [ArgTypes](https://storybook.js.org/docs/api/argtypes)
