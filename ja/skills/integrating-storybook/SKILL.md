---
name: integrating-storybook
description: >
  Storybook と spec.md を連携させるスキル。Component API 仕様から Stories スケルトンを自動生成する。
  Storybook、Stories、コンポーネント仕様、フロントエンドコンポーネント開発で使用。
  CSF3 形式、autodocs 連携、Props から argTypes へのマッピング、コンポーネント API テンプレートをカバー。
  /think（Component API 生成）および /code（Stories 生成）コマンドに必須。
allowed-tools: Read, Write, Glob, Grep
---

# Storybook Integration - Component API から Stories を生成

## 概要

Storybook と Claude Code ワークフローを統合するスキル。以下をカバー：

1. **Component API テンプレート** - spec.md に追加するコンポーネント仕様テンプレート
2. **CSF3 パターン** - Component Story Format 3 のベストプラクティス
3. **Stories 生成** - spec.md から Stories スケルトンを自動生成

## このスキルを使うタイミング

### 自動トリガー

このスキルを有効化するキーワード：

- storybook, stories, ストーリーブック
- component api, コンポーネント仕様, コンポーネントAPI
- props, argTypes, variants
- csf, csf3, autodocs
- フロントエンドコンポーネント

### 明示的な呼び出し

確実に有効化する場合：

- "Storybook 連携を適用"
- "spec から stories を生成"
- "spec.md に component API を追加"

### よくあるシナリオ

- `/think` でフロントエンド機能を計画 → Component API セクションが追加される
- `/code` でコンポーネント実装 → Stories スケルトンが生成される
- コンポーネント仕様の標準化
- Storybook autodocs との統合

## 核となる概念

### 1. spec.md の Component API セクション

`/think` でフロントエンド機能を計画する際に spec.md に追加されるセクション。

**配置場所**: `## 4. UI Specification` 内の `### 4.x Component API: [ComponentName]`

**内容**:

- Props インターフェース（TypeScript）
- バリエーション（size, color, state）
- 状態（default, hover, disabled, loading）
- 使用例

### 2. Stories 生成

`/code` 実行時、spec.md に Component API セクションがある場合に自動生成。

**出力**: `[ComponentName].stories.tsx`

**形式**: CSF3 + autodocs

### 3. フロントエンド判定

機能説明から自動判定：

```typescript
function shouldGenerateComponentAPI(feature: string): boolean {
  const frontendKeywords = [
    /component/i,
    /コンポーネント/,
    /ui/i,
    /ユーザーインターフェース/,
    /frontend/i,
    /フロントエンド/,
    /button/i,
    /form/i,
    /modal/i,
    /dialog/i,
    /card/i,
    /list/i,
    /table/i,
  ];

  const backendKeywords = [
    /api endpoint/i,
    /database/i,
    /server/i,
    /backend/i,
    /cli/i,
    /migration/i,
  ];

  const hasFrontend = frontendKeywords.some(kw => kw.test(feature));
  const hasBackend = backendKeywords.some(kw => kw.test(feature));

  return hasFrontend && !hasBackend;
}
```

## データモデル

### ComponentSpec

```typescript
interface ComponentSpec {
  name: string;                    // コンポーネント名（PascalCase）
  description: string;             // 説明
  props: PropDefinition[];         // Props 定義
  variants: VariantDefinition[];   // バリエーション
  examples: UsageExample[];        // 使用例
}

interface PropDefinition {
  name: string;                    // Prop 名
  type: string;                    // TypeScript 型
  required: boolean;               // 必須かどうか
  defaultValue?: string;           // デフォルト値
  description: string;             // 説明
}

interface VariantDefinition {
  name: string;                    // バリエーション名（例: "size"）
  options: string[];               // 選択肢（例: ["sm", "md", "lg"]）
  defaultOption: string;           // デフォルト値
}

interface UsageExample {
  title: string;                   // 例のタイトル
  code: string;                    // JSX コード
  description?: string;            // 説明
}
```

## テンプレート

### Component API テンプレート

参照: [@./references/component-api-template.md]

### CSF3 パターン

参照: [@./references/csf3-patterns.md]

## 連携ポイント

### コマンドとの連携

- **/think** - フロントエンド機能検出時に Component API セクションを追加
- **/code** - Component API セクションから Stories を生成

### スキルとの連携

- **frontend-patterns** - Container/Presentational パターンとの統合
- **tdd-test-generation** - Stories をテストとして活用

### 連携方法

```yaml
# コマンド YAML フロントマター内
dependencies: [storybook-integration, frontend-patterns]
```

## ワークフロー

### /think → spec.md 生成

```text
/think "Add Button component"
    ↓
shouldGenerateComponentAPI("Add Button component")
    ↓ YES
spec.md に Component API セクション追加:
    ## 4.x Component API: Button
    ### Props
    ### Variants
    ### States
    ### Usage Examples
```

### /code → Stories 生成

```text
/code
    ↓
spec.md に Component API セクションあり?
    ↓ YES
parseComponentSpec(specContent)
    ↓
既存 Stories ファイルあり?
    ├─ YES → 統合戦略を表示（O/S/M/D）
    └─ NO  → generateStoryTemplate(spec) で生成
```

### 既存 Stories との統合（EC-002）

既存 Stories ファイルがある場合の選択肢：

```markdown
[O] 上書き - 既存ファイルを完全に置き換え
[S] スキップ - 既存ファイルを保持、生成しない
[M] マージ（手動）- 差分を表示、手動で統合
[D] 差分のみ - 新規 Stories のみ追記
```

## ベストプラクティス

### 推奨事項

- Props を明示的に型定義する
- Variants は選択肢を網羅する
- Usage Examples は実用的なコードを含める
- autodocs を活用してドキュメント自動生成

### 非推奨事項

- 複雑なロジックを Stories に含めない（play 関数は別途）
- すべての Props 組み合わせを Stories にしない（代表的なものに絞る）
- decorators の過剰使用を避ける

## クイックスタート

### 1. フロントエンド機能の計画

```bash
/think "Add Button component with primary/secondary variants"
```

→ spec.md に Component API セクションが自動追加

### 2. コンポーネント実装

```bash
/code
```

→ Button.tsx と Button.stories.tsx が生成

### 3. Storybook で確認

```bash
npm run storybook
```

→ autodocs で Props ドキュメントが自動生成

## 参考資料

- [@./references/component-api-template.md] - Component API テンプレート
- [@./references/csf3-patterns.md] - CSF3 パターン集
- [Storybook Docs](https://storybook.js.org/docs/writing-stories) - 公式ドキュメント

## 関連スキル

- **frontend-patterns** - コンポーネント設計パターン
- **tdd-test-generation** - テスト駆動開発

## 成功指標

このスキルが機能している時：

- spec.md から Stories が自動生成される
- Props と argTypes が一致している
- autodocs でドキュメントが自動生成される
- チーム間でコンポーネント仕様が共有される
