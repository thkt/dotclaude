# CSF3 Patterns

Component Story Format 3 (Storybook 7+) reference.

## Basic Structure

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  component: Button,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = { args: { children: "Button" } };
```

## Story Patterns

| Pattern | Use Case         | Example                                               |
| ------- | ---------------- | ----------------------------------------------------- |
| Default | Base state       | `{ args: { children: 'Text' } }`                      |
| Variant | Style variations | `{ args: { ...Default.args, variant: 'secondary' } }` |
| Size    | Size variations  | `{ args: { ...Default.args, size: 'lg' } }`           |
| State   | Component states | `{ args: { ...Default.args, disabled: true } }`       |

## Type Mapping

| TypeScript Type | argTypes Control                         |
| --------------- | ---------------------------------------- |
| `string`        | `control: 'text'`                        |
| `number`        | `control: 'number'`                      |
| `boolean`       | `control: 'boolean'`                     |
| `'a' \| 'b'`    | `control: 'select', options: ['a', 'b']` |
| `() => void`    | `action: 'clicked'`                      |
| `Date`          | `control: 'date'`                        |

## ArgTypes Example

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

## Advanced Features

| Feature    | Purpose             | Key                                                     |
| ---------- | ------------------- | ------------------------------------------------------- |
| play       | Interaction testing | `play: async ({ canvasElement }) => {}`                 |
| decorators | Wrap story          | `decorators: [(Story) => <Wrapper><Story /></Wrapper>]` |
| parameters | Story config        | `parameters: { layout: 'fullscreen' }`                  |

## Best Practices

| Do                       | Don't                      |
| ------------------------ | -------------------------- |
| Use `tags: ['autodocs']` | Over-create stories        |
| Spread `...Default.args` | Put business logic         |
| Add descriptions         | Use hardcoded values       |
| Use actions for handlers | Replace tests with stories |
