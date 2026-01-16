# CSF3パターン

Component Story Format 3 (Storybook 7+)リファレンス。

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

## Storyパターン

| パターン | ユースケース       | 例                                                    |
| -------- | ------------------ | ----------------------------------------------------- |
| Default  | 基本状態           | `{ args: { children: 'Text' } }`                      |
| Variant  | スタイル変形       | `{ args: { ...Default.args, variant: 'secondary' } }` |
| Size     | サイズ変形         | `{ args: { ...Default.args, size: 'lg' } }`           |
| State    | コンポーネント状態 | `{ args: { ...Default.args, disabled: true } }`       |

## 型マッピング

| TypeScript型 | argTypesコントロール                     |
| ------------ | ---------------------------------------- |
| `string`     | `control: 'text'`                        |
| `number`     | `control: 'number'`                      |
| `boolean`    | `control: 'boolean'`                     |
| `'a' \| 'b'` | `control: 'select', options: ['a', 'b']` |
| `() => void` | `action: 'clicked'`                      |
| `Date`       | `control: 'date'`                        |

## ArgTypes例

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
| decorators | Storyをラップ          | `decorators: [(Story) => <Wrapper><Story /></Wrapper>]` |
| parameters | Story設定              | `parameters: { layout: 'fullscreen' }`                  |

## ベストプラクティス

| Do                       | Don't                    |
| ------------------------ | ------------------------ |
| `tags: ['autodocs']`使用 | Storiesを作りすぎ        |
| `...Default.args`を展開  | ビジネスロジックを入れる |
| 説明を追加               | ハードコード値を使用     |
| ハンドラーにactions使用  | テストの代替にしない     |
