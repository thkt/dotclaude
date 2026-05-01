# CSF3 Patterns

Component Story Format 3 (Storybook 7+) のリファレンス。

## 基本構造

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

## Story パターン

| パターン | ユースケース           | 例                                                    |
| -------- | ---------------------- | ----------------------------------------------------- |
| Default  | 基本状態               | `{ args: { children: 'Text' } }`                      |
| Variant  | スタイルバリエーション | `{ args: { ...Default.args, variant: 'secondary' } }` |
| Size     | サイズバリエーション   | `{ args: { ...Default.args, size: 'lg' } }`           |
| State    | コンポーネント状態     | `{ args: { ...Default.args, disabled: true } }`       |

## 型マッピング

| TypeScript 型 | argTypes Control                         |
| ------------- | ---------------------------------------- |
| `string`      | `control: 'text'`                        |
| `number`      | `control: 'number'`                      |
| `boolean`     | `control: 'boolean'`                     |
| `'a' \| 'b'`  | `control: 'select', options: ['a', 'b']` |
| `() => void`  | `action: 'clicked'`                      |
| `Date`        | `control: 'date'`                        |

## ArgTypes 例

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

## 高度な機能

| 機能       | 目的                   | キー                                                    |
| ---------- | ---------------------- | ------------------------------------------------------- |
| play       | インタラクションテスト | `play: async ({ canvasElement }) => {}`                 |
| decorators | story を wrap          | `decorators: [(Story) => <Wrapper><Story /></Wrapper>]` |
| parameters | story 設定             | `parameters: { layout: 'fullscreen' }`                  |

## Best Practices

| Do                          | Don't                         |
| --------------------------- | ----------------------------- |
| `tags: ['autodocs']` を使う | story を作りすぎる            |
| `...Default.args` を spread | ビジネスロジックを置く        |
| 説明を追加する              | hardcode 値を使う             |
| handler に actions を使う   | テストを stories で置き換える |
