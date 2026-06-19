# Storybook Phase

/code Step 7. Only when all conditions pass, generate CSF3 stories for the changed components.

## Conditions

All of the following must hold. Evaluated in order, skip silently on the first failure.

1. The project has Storybook (`.storybook/` exists, or `@storybook/*` in package.json deps)
2. The implementation includes a component file (a `.tsx` / `.jsx` with a PascalCase export among the changed files)

## Execution

For each detected component, announce before generating.

```text
[auto-detect] Storybook detected + {File}.tsx appears to be a component.
Will generate {File}.stories.tsx.
```

After announcing, generate `{Component}.stories.tsx` per the CSF3 patterns below. Source props from Spec's Component API section when present, otherwise infer from the component. When generating, observe the following.

- Limit to the base state and the main variants
- Keep logic and hardcoded values out of the story; express state through args
- Do not use stories as a replacement for tests

## Existing Stories Handling

| Option | Action                          |
| ------ | ------------------------------- |
| [O]    | Overwrite the existing file     |
| [S]    | Skip and keep the existing file |
| [M]    | Merge (show diff, manual)       |
| [D]    | Show diff only, append new      |

## CSF3 Patterns

Component Story Format 3 (Storybook 8+) reference.

### Basic Structure

Match the import path to your framework (`@storybook/react-vite`, `@storybook/nextjs`, etc.). `satisfies` makes `StoryObj<typeof meta>` infer args types accurately.

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta = {
  component: Button,
  tags: ["autodocs"],
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: "Button" } };
```

### Story Patterns

| Pattern | Use Case         | Example                                               |
| ------- | ---------------- | ----------------------------------------------------- |
| Default | Base state       | `{ args: { children: 'Text' } }`                      |
| Variant | Style variations | `{ args: { ...Default.args, variant: 'secondary' } }` |
| Size    | Size variations  | `{ args: { ...Default.args, size: 'lg' } }`           |
| State   | Component states | `{ args: { ...Default.args, disabled: true } }`       |

### Type Mapping

| TypeScript Type | argTypes Control                         |
| --------------- | ---------------------------------------- |
| `string`        | `control: 'text'`                        |
| `number`        | `control: 'number'`                      |
| `boolean`       | `control: 'boolean'`                     |
| `'a' \| 'b'`    | `control: 'select', options: ['a', 'b']` |
| `() => void`    | `action: 'clicked'`                      |
| `Date`          | `control: 'date'`                        |

### ArgTypes Example

```tsx
argTypes: {
  variant: {
    control: 'select',
    options: ['primary', 'secondary'],
    table: { defaultValue: { summary: 'primary' } },
  },
  onClick: { action: 'clicked' },
}
```

### Advanced Features

| Feature    | Purpose             | Key                                                     |
| ---------- | ------------------- | ------------------------------------------------------- |
| play       | Interaction testing | `play: async ({ canvas, userEvent }) => {}`             |
| decorators | Wrap story          | `decorators: [(Story) => <Wrapper><Story /></Wrapper>]` |
| parameters | Story config        | `parameters: { layout: 'fullscreen' }`                  |
