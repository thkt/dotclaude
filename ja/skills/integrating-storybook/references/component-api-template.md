# Component API テンプレート

spec.md の `## 4. UI Specification` セクション内に追加される Component API テンプレート。

## テンプレート構造

```markdown
### 4.x Component API: [ComponentName]

#### Description

[コンポーネントの目的と役割を1-2文で説明]

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| children | ReactNode | ✓ | - | 表示するコンテンツ |
| variant | 'primary' \| 'secondary' | - | 'primary' | ビジュアルスタイルのバリエーション |
| size | 'sm' \| 'md' \| 'lg' | - | 'md' | コンポーネントのサイズ |
| disabled | boolean | - | false | インタラクションを無効化 |
| className | string | - | - | 追加の CSS クラス |
| onClick | () => void | - | - | クリックイベントハンドラ |

#### Variants

**variant**
- `primary`: プライマリアクションスタイル - 目立つ、注目を集める
- `secondary`: セカンダリアクションスタイル - 控えめ、目立たない

**size**
- `sm`: 小（32px 高さ）- コンパクトなスペース
- `md`: 中（40px 高さ）- ほとんどの用途でデフォルト
- `lg`: 大（48px 高さ）- 目立つアクション

#### States

| State | Description | Visual Change |
|-------|-------------|---------------|
| default | 通常状態 | ベーススタイル |
| hover | マウスホバー | 背景が少し明るく |
| active | 押下中 | 背景が暗く |
| focus | キーボードフォーカス | フォーカスリング |
| disabled | 非インタラクティブ | 透明度低下、カーソルなし |
| loading | 非同期操作中 | スピナーアイコン、無効化 |

#### Usage Examples

\`\`\`tsx
// 基本的な使用法
<Button onClick={handleClick}>Click me</Button>

// Primary バリエーション（デフォルト）
<Button variant="primary">Submit</Button>

// Secondary バリエーション
<Button variant="secondary">Cancel</Button>

// Large サイズ
<Button size="lg">Large Button</Button>

// Disabled 状態
<Button disabled>Disabled</Button>

// カスタム className 付き
<Button className="my-custom-class">Styled</Button>
\`\`\`

#### Accessibility

- [ ] キーボードナビゲーション: Tab でフォーカス可能、Enter/Space でアクティベート
- [ ] ARIA 属性: disabled 時に aria-disabled
- [ ] カラーコントラスト: WCAG AA 準拠
- [ ] フォーカスインジケーター: 視覚的なフォーカスリング
```

## 入力例: Button コンポーネント

```markdown
### 4.1 Component API: Button

#### Description

アクションをトリガーするためのインタラクティブなボタンコンポーネント。
フォーム送信、ダイアログの開閉、ナビゲーションなどに使用。

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| children | ReactNode | ✓ | - | ボタンのラベルテキストまたはコンテンツ |
| variant | 'primary' \| 'secondary' \| 'ghost' | - | 'primary' | ビジュアルスタイル |
| size | 'sm' \| 'md' \| 'lg' | - | 'md' | ボタンのサイズ |
| disabled | boolean | - | false | 無効化状態 |
| loading | boolean | - | false | ローディング状態 |
| fullWidth | boolean | - | false | 親要素の幅いっぱいに広がる |
| type | 'button' \| 'submit' \| 'reset' | - | 'button' | HTML ボタンタイプ |
| onClick | () => void | - | - | クリックイベントハンドラ |

#### Variants

**variant**
- `primary`: メインアクション - 青背景、白テキスト
- `secondary`: サブアクション - グレー背景、ダークテキスト
- `ghost`: 控えめなアクション - 透明背景、ボーダーのみ

**size**
- `sm`: 小（32px）- インラインアクション、テーブル内
- `md`: 中（40px）- 一般的な用途
- `lg`: 大（48px）- ヒーローセクション、重要な CTA

#### States

| State | Description | Visual Change |
|-------|-------------|---------------|
| default | 通常状態 | ベーススタイル |
| hover | ホバー時 | 背景色が少し明るく |
| active | クリック中 | 背景色が少し暗く |
| focus | フォーカス時 | 青いフォーカスリング |
| disabled | 無効状態 | 50%透明、カーソル not-allowed |
| loading | 読み込み中 | スピナー表示、クリック不可 |

#### Usage Examples

\`\`\`tsx
// 基本的な使用法
<Button onClick={() => console.log('clicked')}>Click me</Button>

// バリエーション
<Button variant="primary">Submit</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">Learn more</Button>

// サイズ
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// 状態
<Button disabled>Disabled</Button>
<Button loading>Saving...</Button>

// フォーム送信
<Button type="submit">Submit Form</Button>

// フル幅
<Button fullWidth>Full Width Button</Button>
\`\`\`

#### Accessibility

- [x] Tab キーでフォーカス可能
- [x] Enter/Space キーでアクティベート
- [x] disabled 時は aria-disabled="true"
- [x] loading 時は aria-busy="true"
- [x] WCAG AA コントラスト比準拠
- [x] 視覚的なフォーカスインジケーター
```

## 入力例: Card コンポーネント

```markdown
### 4.2 Component API: Card

#### Description

関連するコンテンツをグループ化して表示するコンテナコンポーネント。
記事のプレビュー、プロダクトカード、ユーザープロフィールなどに使用。

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| children | ReactNode | ✓ | - | カード内のコンテンツ |
| variant | 'elevated' \| 'outlined' \| 'filled' | - | 'elevated' | カードのスタイル |
| padding | 'none' \| 'sm' \| 'md' \| 'lg' | - | 'md' | 内側の余白 |
| clickable | boolean | - | false | クリック可能かどうか |
| onClick | () => void | - | - | クリックイベントハンドラ |
| href | string | - | - | リンク先 URL（指定時は <a> としてレンダリング） |

#### Variants

**variant**
- `elevated`: シャドウ付き - デフォルト、浮いているように見える
- `outlined`: ボーダー付き - フラットなデザイン、軽い印象
- `filled`: 背景色付き - グレー背景、区切りが明確

**padding**
- `none`: 0px - カスタムレイアウト用
- `sm`: 12px - コンパクトな表示
- `md`: 16px - 標準的な余白
- `lg`: 24px - ゆったりとした余白

#### States

| State | Description | Visual Change |
|-------|-------------|---------------|
| default | 通常状態 | ベーススタイル |
| hover | ホバー時（clickable=true） | シャドウが強くなる |
| focus | フォーカス時 | フォーカスリング |

#### Usage Examples

\`\`\`tsx
// 基本的な使用法
<Card>
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</Card>

// バリエーション
<Card variant="elevated">Elevated Card</Card>
<Card variant="outlined">Outlined Card</Card>
<Card variant="filled">Filled Card</Card>

// クリック可能
<Card clickable onClick={() => navigate('/detail')}>
  Click me to navigate
</Card>

// リンクとして
<Card href="/product/123">
  View Product
</Card>

// パディングなし（カスタムレイアウト）
<Card padding="none">
  <img src="..." className="w-full" />
  <div className="p-4">Content</div>
</Card>
\`\`\`

#### Accessibility

- [x] clickable 時は role="button" または <a> タグ
- [x] Tab キーでフォーカス可能（clickable/href 時）
- [x] Enter/Space キーでアクティベート
- [x] 視覚的なフォーカスインジケーター
```

## テンプレート変数

| 変数 | 説明 | 例 |
|------|------|-----|
| `[ComponentName]` | コンポーネント名（PascalCase） | `Button`, `Card` |
| `[Description]` | 1-2 文の説明 | "アクションをトリガーする..." |
| Props テーブル | Markdown テーブル | 上記参照 |
| Variants セクション | バリエーションの説明 | 上記参照 |
| States テーブル | 状態の一覧 | 上記参照 |
| Usage Examples | TSX コードブロック | 上記参照 |
| Accessibility | チェックリスト | 上記参照 |

## 生成ルール

### Props テーブル

1. **Required を先に**: 必須の Props を先に記載
2. **アルファベット順**: 同じ Required レベル内ではアルファベット順
3. **children を最初に**: children は常に最初
4. **handlers を最後に**: onClick などのハンドラは最後

### Variants セクション

1. **variant prop ごとに1サブセクション**: variant, size など
2. **全オプションをリスト**: 選択肢をすべて記載
3. **デフォルトを含める**: デフォルト値を明示

### Usage Examples

1. **基本を最初に**: 最もシンプルな使用例を最初に
2. **段階的に複雑に**: 徐々に複雑な例を追加
3. **全バリエーションをカバー**: すべてのバリエーションを網羅
4. **実用的なコンテキスト**: 実用的なコンテキストで例示

## パースのヒント

spec.md からパースする際のヒント：

```typescript
// Component API セクションの検出
const componentApiRegex = /### \d+\.\d+ Component API: (\w+)/;

// Props テーブルのパース
const propsTableRegex = /\| Prop \| Type \| Required \| Default \| Description \|[\s\S]*?(?=####|$)/;

// Variants セクションの検出
const variantsRegex = /#### Variants[\s\S]*?(?=####|$)/;
```
