# Storybook統合（オプション）

このモジュールは、spec.mdのコンポーネントAPIセクションからのStories自動生成を処理します。

## Stories自動生成

spec.mdに**コンポーネントAPIセクション**（`### 4.x Component API:`）が含まれる場合、Storiesを自動生成します。

**トリガー条件**：

- spec.mdに`### 4.x Component API:`セクションが含まれる
- storybook-integration skillを参照

**プロセス**：

1. spec.mdからComponentSpecを解析
2. 既存のStoriesファイルを確認
3. ユーザーの選択に基づいて生成または更新

## Stories生成フロー

```text
spec.mdにコンポーネントAPIセクション？
    ├─ YES → parseComponentSpec()
    │         ↓
    │   既存のStoriesファイル？
    │         ├─ YES → 統合戦略を表示（EC-002）
    │         └─ NO  → generateStoryTemplate()
    └─ NO  → 通常の実装フロー（スキップ）
             ログ: "spec.mdにコンポーネントAPIが見つかりません、Stories生成をスキップします"
```

## 既存Stories統合（EC-002）

既存のStoriesファイルが見つかった場合のオプション：

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ 既存のStoriesファイルを検出

ファイル: [path/to/Component.stories.tsx]
Storiesカウント: [count]

[O] Overwrite - 既存ファイルを完全に置き換え
[S] Skip - 既存ファイルを保持、生成しない
[M] Merge（手動） - 差分を表示、手動統合
[D] Diffのみ - 新しいStoriesのみを追加

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 生成されるStoriesフォーマット（CSF3）

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta: Meta<typeof ComponentName> = {
  title: 'Components/ComponentName',
  component: ComponentName,
  tags: ['autodocs'],
  argTypes: {
    // Propsテーブルから自動生成
  },
};

export default meta;
type Story = StoryObj<typeof ComponentName>;

export const Default: Story = { args: { /* 使用例から */ } };
// バリアントStories...
// 状態Stories...
```

## 完全なテンプレート

参照: [@~/.claude/skills/integrating-storybook/SKILL.md] 完全なテンプレートと高度なオプション。
