# Storybook統合（オプション）

このモジュールはspec.mdのComponent APIセクションからの自動Stories生成を処理します。

## 自動Stories生成

spec.mdに**Component APIセクション** (`### 4.x Component API:`) が含まれる場合、自動的にStoriesを生成。

**トリガー条件**:

- spec.mdに`### 4.x Component API:`セクションが含まれる
- storybook-integrationスキルを参照

**プロセス**:

1. spec.mdからComponentSpecをパース
2. 既存Storiesファイルを確認
3. ユーザーの選択に基づいて生成または更新

## Stories生成フロー

```text
spec.mdにComponent APIセクションがある？
    ├─ YES → parseComponentSpec()
    │         ↓
    │   既存Storiesファイルがある？
    │         ├─ YES → 統合戦略を表示 (EC-002)
    │         └─ NO  → generateStoryTemplate()
    └─ NO  → 通常の実装フロー（スキップ）
             ログ: "spec.mdにComponent APIが見つかりません、Stories生成をスキップ"
```

## 既存Stories統合 (EC-002)

既存Storiesファイルが見つかった場合のオプション:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[WARN] 既存Storiesファイルを検出

ファイル: [path/to/Component.stories.tsx]
Stories数: [count]

[O] 上書き - 既存ファイルを完全に置換
[S] スキップ - 既存ファイルを維持、生成しない
[M] マージ（手動） - diffを表示、手動で統合
[D] Diffのみ - 新しいStoriesのみを追加

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 生成されるStoriesフォーマット (CSF3)

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

export const Default: Story = { args: { /* Usage Examplesから */ } };
// バリアントStories...
// 状態Stories...
```

## 完全なテンプレート

参照: [@../../../../skills/integrating-storybook/SKILL.md] 完全なテンプレートと高度なオプション。
