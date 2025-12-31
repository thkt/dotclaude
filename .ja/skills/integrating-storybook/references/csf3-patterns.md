# CSF3パターン - Component Story Format 3ベストプラクティス

## 概要

Storybook 7+で採用されているComponent Story Format 3（CSF3）のパターンリファレンス。
Stories自動生成時に参照。

## 基本構造

### 最小限のStory

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

### 完全なStory（TagsとArgTypes付き）

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
      description: '視覚的なスタイルバリアント',
      table: {
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'サイズバリアント',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'インタラクションを無効化',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    onClick: {
      action: 'clicked',
      description: 'クリックハンドラー',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;
```

## Storyパターン

### 1. Default Story

最もシンプルなデフォルト状態。

```tsx
export const Default: Story = {
  args: {
    children: 'Button',
  },
};
```

### 2. Variant Stories

各バリアントを個別に定義。

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

サイズバリエーション。

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

コンポーネントの状態。

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

複数コンポーネントの組み合わせ。

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
    'aria-label': 'アイテムを追加',
  },
};
```

## 高度なパターン

### Play Function（インタラクションテスト）

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

## ArgTypesリファレンス

### コントロールタイプ

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

### テーブル設定

```tsx
argTypes: {
  variant: {
    control: 'select',
    options: ['primary', 'secondary'],
    description: 'ボタンの視覚的なスタイル',
    table: {
      type: { summary: "'primary' | 'secondary'" },
      defaultValue: { summary: 'primary' },
      category: 'Appearance',
    },
  },
}
```

## 生成テンプレート

spec.mdのComponent APIから生成されるテンプレート:

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

## 型マッピング

Props型からargTypesへの変換ルール:

| TypeScript型 | argTypes control |
| --- | --- |
| `string` | `control: 'text'` |
| `number` | `control: 'number'` |
| `boolean` | `control: 'boolean'` |
| `'a' \| 'b' \| 'c'` | `control: 'select', options: ['a', 'b', 'c']` |
| `ReactNode` | `control: 'text'` |
| `() => void` | `action: 'actionName'` |
| `Date` | `control: 'date'` |

## ベストプラクティス

### 推奨事項

1. **autodocsを使用** - 自動ドキュメント生成のため`tags: ['autodocs']`
2. **Defaultをベースに** - 他のStoriesは`...Default.args`をスプレッド
3. **説明を書く** - argTypesに説明を追加
4. **actionsを使用** - イベントハンドラーを`action: 'name'`で記録

### 非推奨事項

1. **Storiesを作りすぎない** - 代表的なものに集中
2. **複雑なロジックを避ける** - Storiesにビジネスロジックを入れない
3. **ハードコード値を避ける** - 外部から制御するためにargsを使用
4. **テストの代替にしない** - Storiesは視覚的確認用、テストは別途

## リファレンス

- [Storybook CSF3 Migration](https://storybook.js.org/docs/migration-guide)
- [Writing Stories](https://storybook.js.org/docs/writing-stories)
- [ArgTypes](https://storybook.js.org/docs/api/argtypes)
