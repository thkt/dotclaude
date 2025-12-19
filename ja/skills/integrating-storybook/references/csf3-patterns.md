# CSF3 パターン - Component Story Format 3 ベストプラクティス

## 概要

Storybook 7+ で採用された Component Story Format 3 (CSF3) のパターン集。
Stories 自動生成時に参照される。

## 基本構造

### 最小限の Story

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

### Tags と ArgTypes を含む完全な Story

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
      description: 'ビジュアルスタイルのバリエーション',
      table: {
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'サイズバリエーション',
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
      description: 'クリックハンドラ',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;
```

## Story パターン

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

各バリエーションを個別に定義。

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

複数のコンポーネントを組み合わせ。

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

### Play 関数（インタラクションテスト）

```tsx
import { within, userEvent, expect } from '@storybook/test';

export const ClickInteraction: Story = {
  args: {
    children: 'クリックして',
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

## ArgTypes リファレンス

### Control タイプ

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

### Table 設定

```tsx
argTypes: {
  variant: {
    control: 'select',
    options: ['primary', 'secondary'],
    description: 'ボタンのビジュアルスタイル',
    table: {
      type: { summary: "'primary' | 'secondary'" },
      defaultValue: { summary: 'primary' },
      category: 'Appearance',
    },
  },
}
```

## 生成テンプレート

spec.md の Component API から生成されるテンプレート：

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

Props の型から argTypes への変換ルール：

| TypeScript 型 | argTypes control |
|--------------|------------------|
| `string` | `control: 'text'` |
| `number` | `control: 'number'` |
| `boolean` | `control: 'boolean'` |
| `'a' \| 'b' \| 'c'` | `control: 'select', options: ['a', 'b', 'c']` |
| `ReactNode` | `control: 'text'` |
| `() => void` | `action: 'actionName'` |
| `Date` | `control: 'date'` |

## ベストプラクティス

### 推奨事項

1. **autodocs を活用** - `tags: ['autodocs']` で自動ドキュメント生成
2. **Default を基準に** - 他の Stories は `...Default.args` を展開
3. **description を記述** - argTypes に説明を追加
4. **action を使用** - イベントハンドラは `action: 'name'` で記録

### 非推奨事項

1. **Stories の過剰作成** - 代表的なものに絞る
2. **複雑なロジック** - Stories 内にビジネスロジックを入れない
3. **ハードコードされた値** - args を使って外部から制御可能に
4. **テストの代替** - Stories は視覚的確認、テストは別途

## 参考資料

- [Storybook CSF3 Migration](https://storybook.js.org/docs/migration-guide)
- [Writing Stories](https://storybook.js.org/docs/writing-stories)
- [ArgTypes](https://storybook.js.org/docs/api/argtypes)
