# Storybook フェーズ

`/code` Step 7。条件をすべて満たしたときのみ、変更されたコンポーネントの CSF3 stories を生成する。

## 条件

次をすべて満たすこと。順に評価し、最初の失敗で告知なくスキップする。

1. プロジェクトに Storybook がある (`.storybook/` が存在、または package.json deps に `@storybook/*`)
2. 実装にコンポーネントファイルがある (変更ファイルに PascalCase export の `.tsx` / `.jsx`)

## 実行

検出された各コンポーネントについて、生成前にまず通知する。

```text
[auto-detect] Storybook detected + {File}.tsx appears to be a component.
Will generate {File}.stories.tsx.
```

通知後、下記 CSF3 パターンに従い `{Component}.stories.tsx` を生成する。Spec の Component API セクションがあれば props をそこから取得し、なければコンポーネントから推論する。生成時は次を守る。

- 基本状態と主要な variant に絞る
- story にロジックや hardcode 値を置かず、args で表現する
- test の代替にはしない

## 既存 Stories の扱い

| 選択肢 | アクション                       |
| ------ | -------------------------------- |
| [O]    | 既存ファイルを上書きする         |
| [S]    | スキップして既存を保持する       |
| [M]    | マージする (diff を表示して手動) |
| [D]    | Diff のみ表示し、新規を追記する  |

## CSF3 パターン

Component Story Format 3 (Storybook 8+) のリファレンス。

### 基本構造

import パスはフレームワークに合わせる (`@storybook/react-vite`, `@storybook/nextjs` 等)。`satisfies` で `StoryObj<typeof meta>` の args 型推論が正確になる。

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

### Story パターン

| パターン | ユースケース           | 例                                                    |
| -------- | ---------------------- | ----------------------------------------------------- |
| Default  | 基本状態               | `{ args: { children: 'Text' } }`                      |
| Variant  | スタイルバリエーション | `{ args: { ...Default.args, variant: 'secondary' } }` |
| Size     | サイズバリエーション   | `{ args: { ...Default.args, size: 'lg' } }`           |
| State    | コンポーネント状態     | `{ args: { ...Default.args, disabled: true } }`       |

### 型マッピング

| TypeScript 型 | argTypes Control                         |
| ------------- | ---------------------------------------- |
| `string`      | `control: 'text'`                        |
| `number`      | `control: 'number'`                      |
| `boolean`     | `control: 'boolean'`                     |
| `'a' \| 'b'`  | `control: 'select', options: ['a', 'b']` |
| `() => void`  | `action: 'clicked'`                      |
| `Date`        | `control: 'date'`                        |

### ArgTypes 例

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

### 高度な機能

| 機能       | 目的                   | キー                                                    |
| ---------- | ---------------------- | ------------------------------------------------------- |
| play       | インタラクションテスト | `play: async ({ canvas, userEvent }) => {}`             |
| decorators | story をラップ         | `decorators: [(Story) => <Wrapper><Story /></Wrapper>]` |
| parameters | story 設定             | `parameters: { layout: 'fullscreen' }`                  |
