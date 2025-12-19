<!--
Golden Master: Spec - Storybook Integration

選定理由:
- フロントエンド機能の明確なFR構造
- Component API仕様のSpec形式
- CSF3 Stories生成パターン

特徴:
- UI/コンポーネントSpecの参考例
- トリガーキーワード定義
- /thinkワークフローとの統合

参照元: ~/.claude/workspace/planning/2025-12-14-storybook-integration/

Last Reviewed: 2025-12-17
Update Reason: メンテナンスメタデータフィールド追加
Previous Version: N/A
-->

# Specification: Storybook 連携機能

Version: 1.1.0
Based on: SOW v1.1.0
Last Updated: 2025-12-14 (Revised)

---

## 1. Functional Requirements

### 1.1 スキル作成 (storybook-integration)

[✓] FR-001: スキルファイル構造

- 場所: `~/.claude/skills/integrating-storybook/`
- 構成:
  - `SKILL.md` - メインスキルファイル
  - `references/csf3-patterns.md` - CSF3 パターン集
  - `references/component-api-template.md` - API テンプレート

[✓] FR-002: スキルのトリガーキーワード

- Keywords: storybook, stories, component api, コンポーネント仕様
- Auto-trigger: フロントエンド実装時

### 1.2 /think 拡張

[✓] FR-003: spec.md に Component API セクション追加

- 場所: セクション 4 (UI Specification) 内
- 内容:
  - Props Interface (TypeScript)
  - Variants (size, color, state)
  - Usage Examples

[→] FR-004: Component API セクションの自動判定

- トリガー条件: 機能説明に「コンポーネント」「UI」「フロントエンド」が含まれる
- スキップ条件: バックエンド、API、CLI 実装

### 1.3 /code 拡張

[→] FR-005: Stories スケルトン自動生成

- トリガー: spec.md に Component API セクションが存在
- 出力: `ComponentName.stories.tsx`
- 形式: CSF3 + autodocs

[→] FR-006: Stories の内容

- Default Story
- Variants Stories (size, color 等)
- State Stories (loading, error, disabled 等)
- argTypes 自動生成

### 1.4 Edge Cases

[→] EC-001: Component API セクションがない場合

- Action: Stories 生成をスキップ
- ログ: 「Component API not found in spec.md, skipping Stories generation」

[→] EC-002: 既存 Stories ファイルがある場合

- Action: 上書き確認を表示
- Options: [O]verwrite, [S]kip, [M]erge (手動)

**統合戦略詳細:**

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ 既存 Stories ファイルを検出

ファイル: src/components/Button/Button.stories.tsx
最終更新: 2025-12-10 14:23
Stories 数: 5 (Default, Primary, Secondary, Small, Large)

生成予定の Stories: 6 (Default, Primary, Secondary, Small, Large, Disabled)

差分:
+ Disabled (新規)
~ argTypes 更新 (variant, size)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[O] 上書き - 既存ファイルを完全に置き換え
[S] スキップ - 既存ファイルを保持、生成しない
[M] マージ（手動）- 差分を表示、手動で統合
[D] 差分のみ - 新規 Stories のみ追記

選択してください (O/S/M/D):
```

**判断基準:**

- 既存 Stories にカスタムロジック（play 関数、decorators 等）がある場合 → [S] or [M] 推奨
- 既存 Stories が自動生成されたものの場合 → [O] 推奨
- 新規 Stories のみ追加したい場合 → [D] 推奨

**移行パス:**

1. 初回導入時: 既存 Stories は [S] でスキップ
2. 段階的移行: 手動で spec.md の Component API を記述 → [O] で再生成
3. 完全移行: すべてのコンポーネントに Component API を定義

---

## 2. Data Model

### 2.1 ComponentSpec

```typescript
interface ComponentSpec {
  name: string;                    // コンポーネント名 (PascalCase)
  description: string;             // 説明
  props: PropDefinition[];         // Props 定義
  variants: VariantDefinition[];   // バリエーション
  examples: UsageExample[];        // 使用例
}

interface PropDefinition {
  name: string;                    // Prop 名
  type: string;                    // TypeScript 型
  required: boolean;               // 必須か
  defaultValue?: string;           // デフォルト値
  description: string;             // 説明
}

interface VariantDefinition {
  name: string;                    // バリエーション名 (e.g., "size")
  options: string[];               // 選択肢 (e.g., ["sm", "md", "lg"])
  defaultOption: string;           // デフォルト値
}

interface UsageExample {
  title: string;                   // 例のタイトル
  code: string;                    // JSX コード
  description?: string;            // 説明
}
```

---

## 3. UI Specification (Templates)

### 3.1 spec.md Component API セクションテンプレート

````markdown
### 4.x Component API: [ComponentName]

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| children | ReactNode | ✓ | - | Content to display |
| variant | 'primary' \| 'secondary' | - | 'primary' | Visual style |
| size | 'sm' \| 'md' \| 'lg' | - | 'md' | Size variant |
| disabled | boolean | - | false | Disable interactions |
| onClick | () => void | - | - | Click handler |

### Variants

**Size**
- `sm`: Small (32px height)
- `md`: Medium (40px height) - Default
- `lg`: Large (48px height)

**Variant**
- `primary`: Primary action style
- `secondary`: Secondary action style

### States

- `default`: Normal state
- `hover`: Mouse hover
- `active`: Being clicked
- `disabled`: Non-interactive
- `loading`: Async operation

### Usage Examples

```tsx
// Basic usage
<Button onClick={handleClick}>Click me</Button>

// With variants
<Button variant="secondary" size="lg">Large Secondary</Button>

// Disabled state
<Button disabled>Disabled</Button>
```

````

### 3.2 生成される Stories テンプレート

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { [ComponentName] } from './[ComponentName]';

const meta: Meta<typeof [ComponentName]> = {
  title: 'Components/[ComponentName]',
  component: [ComponentName],
  tags: ['autodocs'],
  argTypes: {
    // Auto-generated from Props
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof [ComponentName]>;

// Default Story
export const Default: Story = {
  args: {
    children: '[ComponentName] Content',
  },
};

// Variant Stories
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

// Size Stories
export const Small: Story = {
  args: {
    ...Default.args,
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    ...Default.args,
    size: 'lg',
  },
};

// State Stories
export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
  },
};
```

---

## 4. Dependencies

### 4.1 External Libraries

[✓] @storybook/react: ^7.0.0 (CSF3 support)
[→] @storybook/addon-docs: ^7.0.0 (autodocs support)

### 4.2 Internal Dependencies

[✓] ~/.claude/commands/think.md - 拡張対象
[✓] ~/.claude/commands/code.md - 拡張対象
[✓] ~/.claude/skills/applying-frontend-patterns/SKILL.md - 参照

---

## 5. Non-Functional Requirements

### 5.1 Performance

[✓] NFR-001: Stories 生成時間

- 目標: < 2秒（単一コンポーネント）
- 測定: spec.md 読み込み + テンプレート生成 + ファイル書き込み
- SOW Success Metrics と整合

[→] NFR-002: spec.md パース時間

- 目標: < 500ms
- 対象: Component API セクションの抽出

### 5.2 Maintainability

[✓] NFR-003: 生成コードの品質

- ESLint/Prettier 準拠
- TypeScript strict モード対応
- 手動編集しやすい構造

[→] NFR-004: テンプレートのカスタマイズ性

- テンプレートは `references/` 配下で管理
- プロジェクト固有のカスタマイズは `.claude/CLAUDE.md` で上書き可能

### 5.3 Extensibility

[→] NFR-005: 他フレームワーク対応の考慮

- 現在: React + CSF3 のみ
- 将来: Vue, Svelte への拡張を想定した設計
- 拡張ポイント: `generateStoryTemplate()` を抽象化

[→] NFR-006: 他 Storybook 形式への対応

- 現在: CSF3 のみ
- 将来: CSF2, MDX への拡張を考慮
- 拡張ポイント: テンプレート切り替え機構

---

## 6. Implementation Details

### 6.1 Modified Files

| ファイル | 変更内容 | 優先度 |
|----------|---------|--------|
| `~/.claude/commands/think.md` | spec.md テンプレートに Component API セクション追加 | Phase 2 |
| `~/.claude/commands/code.md` | Stories 生成ロジック追加 | Phase 3 |

### 6.2 New Files (Phase 1)

```text
~/.claude/skills/integrating-storybook/
├── SKILL.md                              # メインスキルファイル
└── references/
    ├── csf3-patterns.md                  # CSF3 パターン集
    └── component-api-template.md         # Component API テンプレート
```

### 6.3 New Functions

#### storybook-integration スキル内で定義

```typescript
/**
 * spec.md から Component API セクションを抽出
 * @param specContent - spec.md の内容
 * @returns ComponentSpec | null
 */
function parseComponentSpec(specContent: string): ComponentSpec | null

/**
 * ComponentSpec から CSF3 形式の Stories を生成
 * @param spec - コンポーネント仕様
 * @returns Stories ファイルの内容
 */
function generateStoryTemplate(spec: ComponentSpec): string

/**
 * 機能説明からフロントエンド実装かどうかを判定
 * @param feature - 機能説明文字列
 * @returns boolean
 */
function shouldGenerateComponentAPI(feature: string): boolean
```

### 6.4 /think.md 変更箇所

**追加位置**: `## Specification Document (spec.md) Structure` セクション内

```markdown
## 4. UI Specification (Frontend features)

### 4.1 [Screen/Component Name]
... (既存)

#### 4.x Component API: [ComponentName]  ← NEW
（storybook-integration スキルのテンプレートを参照）
```

**判定ロジック追加位置**: SOW 生成前の分析フェーズ

```typescript
// Feature description analysis
const isFrontendFeature = shouldGenerateComponentAPI(featureDescription);

if (isFrontendFeature) {
  // Include Component API section in spec.md template
}
```

### 6.5 /code.md 変更箇所

**追加位置**: `## Specification Context (Auto-Detection)` セクションの後

```markdown
## Storybook Integration (Optional)

### Stories Generation

If spec.md contains Component API section:
1. Parse ComponentSpec from spec.md
2. Check for existing Stories file
3. Generate or update Stories based on user choice

### Trigger Condition
- spec.md に `## 4.x Component API:` セクションが存在
- storybook-integration スキルが有効
```

### 6.6 処理フロー図

```text
/think 実行
    ↓
shouldGenerateComponentAPI(feature)?
    ├─ YES → spec.md に Component API セクション追加
    └─ NO  → 通常の spec.md 生成

/code 実行
    ↓
spec.md に Component API セクションあり?
    ├─ YES → parseComponentSpec() でパース
    │         ↓
    │   既存 Stories ファイルあり?
    │         ├─ YES → EC-002 統合戦略表示
    │         └─ NO  → generateStoryTemplate() で生成
    └─ NO  → 通常の実装フロー
```

---

## 7. Test Scenarios

### 7.1 Unit Tests

```typescript
describe('storybook-integration', () => {
  describe('parseComponentSpec', () => {
    it('[✓] extracts component spec from spec.md', () => {
      // Given: spec.md with Component API section
      const specContent = `## 4.1 Component API: Button\n...`;

      // When: parsing the spec
      const result = parseComponentSpec(specContent);

      // Then: component spec is extracted
      expect(result.name).toBe('Button');
      expect(result.props).toHaveLength(5);
    });

    it('[→] returns null if no Component API section', () => {
      // Given: spec.md without Component API
      const specContent = `## 4.1 Screen Layout\n...`;

      // When: parsing the spec
      const result = parseComponentSpec(specContent);

      // Then: null returned
      expect(result).toBeNull();
    });
  });

  describe('generateStoryTemplate', () => {
    it('[✓] generates CSF3 format story', () => {
      // Given: component spec
      const spec: ComponentSpec = {
        name: 'Button',
        props: [...],
        variants: [...],
      };

      // When: generating story
      const story = generateStoryTemplate(spec);

      // Then: valid CSF3 format
      expect(story).toContain("import type { Meta, StoryObj }");
      expect(story).toContain("tags: ['autodocs']");
    });
  });
});
```

### 7.2 Integration Tests

```typescript
describe('/think with storybook-integration', () => {
  it('[→] includes Component API section for frontend features', async () => {
    // Given: frontend feature description
    const feature = "Add Button component with variants";

    // When: running /think
    await runThinkCommand(feature);

    // Then: spec.md contains Component API
    const spec = readSpec();
    expect(spec).toContain('## 4.');
    expect(spec).toContain('Component API');
  });
});

describe('/code with storybook-integration', () => {
  it('[→] generates stories when Component API exists', async () => {
    // Given: spec.md with Component API
    // When: running /code
    // Then: Button.stories.tsx is created
  });
});
```

---

## 6. Known Issues & Assumptions

### Assumptions (→)

1. [→] Storybook 7+ 使用 - CSF3 形式前提
2. [→] React + TypeScript プロジェクト
3. [→] autodocs アドオン有効

### Unknown / Need Verification (?)

1. [?] 具体的な Storybook バージョン
2. [?] 既存プロジェクトの Stories 構成
3. [?] デザインシステム / デザイントークンの有無

---

## 7. Implementation Checklist

### Phase 1: スキル作成

- [ ] `~/.claude/skills/integrating-storybook/SKILL.md` 作成
- [ ] `references/csf3-patterns.md` 作成
- [ ] `references/component-api-template.md` 作成

### Phase 2: /think 拡張

- [ ] spec.md テンプレートに Component API セクション追加
- [ ] フロントエンド判定ロジック追加
- [ ] 既存 UI Specification セクションとの統合

### Phase 3: /code 拡張

- [ ] spec.md から ComponentSpec 抽出ロジック
- [ ] Stories テンプレート生成ロジック
- [ ] 既存ファイル検出・確認ロジック

### Phase 4: 検証

- [ ] 実プロジェクトでのテスト
- [ ] ドキュメント更新
- [ ] 日本語版ドキュメント同期

---

## 8. References

- SOW: `sow.md`
- Related: `~/.claude/skills/applying-frontend-patterns/SKILL.md`
- Storybook Docs: <https://storybook.js.org/docs/writing-stories>
