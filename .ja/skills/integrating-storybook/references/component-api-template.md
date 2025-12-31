# Component APIテンプレート

spec.mdの`## 4. UI仕様`セクションに追加するComponent APIテンプレート。

## テンプレート構造

```markdown
### 4.x Component API: [ComponentName]

#### 説明

[コンポーネントの目的と役割を1-2文で]

#### Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| children | ReactNode | ✓ | - | 表示するコンテンツ |
| variant | 'primary' \| 'secondary' | - | 'primary' | 視覚的なスタイルバリアント |
| size | 'sm' \| 'md' \| 'lg' | - | 'md' | コンポーネントのサイズ |
| disabled | boolean | - | false | インタラクションを無効化 |
| className | string | - | - | 追加のCSSクラス |
| onClick | () => void | - | - | クリックイベントハンドラー |

#### バリアント

**variant**
- `primary`: プライマリアクションスタイル - 太字、注目を集める
- `secondary`: セカンダリアクションスタイル - 控えめ、目立たない

**size**
- `sm`: スモール（32px高さ）- コンパクトなスペース
- `md`: ミディアム（40px高さ）- ほとんどのユースケースのデフォルト
- `lg`: ラージ（48px高さ）- 目立つアクション

#### 状態

| State | Description | Visual Change |
| --- | --- | --- |
| default | 通常状態 | ベーススタイリング |
| hover | マウスホバー | 背景がわずかに明るく |
| active | 押下中 | 背景がわずかに暗く |
| focus | キーボードフォーカス | フォーカスリング |
| disabled | 非インタラクティブ | 不透明度低下、カーソルなし |
| loading | 非同期操作中 | スピナーアイコン、無効化 |

#### 使用例

\`\`\`tsx
// 基本的な使用法
<Button onClick={handleClick}>Click me</Button>

// Primaryバリアント（デフォルト）
<Button variant="primary">Submit</Button>

// Secondaryバリアント
<Button variant="secondary">Cancel</Button>

// Largeサイズ
<Button size="lg">Large Button</Button>

// Disabled状態
<Button disabled>Disabled</Button>

// カスタムclassName付き
<Button className="my-custom-class">Styled</Button>
\`\`\`

#### アクセシビリティ

- [ ] キーボードナビゲーション: Tabでフォーカス可能、Enter/Spaceでアクティブ化
- [ ] ARIA属性: 無効時にaria-disabled
- [ ] 色コントラスト: WCAG AA準拠
- [ ] フォーカスインジケーター: 可視フォーカスリング
```

## 記入例: Buttonコンポーネント

```markdown
### 4.1 Component API: Button

#### 説明

アクションをトリガーするためのインタラクティブなボタンコンポーネント。
フォーム送信、ダイアログの開閉、ナビゲーションなどに使用。

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| children | ReactNode | ✓ | - | ボタンラベルテキストまたはコンテンツ |
| variant | 'primary' \| 'secondary' \| 'ghost' | - | 'primary' | 視覚的なスタイル |
| size | 'sm' \| 'md' \| 'lg' | - | 'md' | ボタンサイズ |
| disabled | boolean | - | false | 無効状態 |
| loading | boolean | - | false | 読み込み状態 |
| fullWidth | boolean | - | false | 親の幅に拡張 |
| type | 'button' \| 'submit' \| 'reset' | - | 'button' | HTMLボタンタイプ |
| onClick | () => void | - | - | クリックイベントハンドラー |

#### バリアント

**variant**
- `primary`: メインアクション - 青背景、白テキスト
- `secondary`: サブアクション - グレー背景、ダークテキスト
- `ghost`: 控えめなアクション - 透明背景、ボーダーのみ

**size**
- `sm`: スモール（32px）- インラインアクション、テーブル内
- `md`: ミディアム（40px）- 一般的な使用
- `lg`: ラージ（48px）- ヒーローセクション、重要なCTA

#### 状態

| State | Description | Visual Change |
|-------|-------------|---------------|
| default | 通常状態 | ベーススタイリング |
| hover | ホバー時 | 背景がわずかに明るく |
| active | クリック中 | 背景がわずかに暗く |
| focus | フォーカス時 | 青いフォーカスリング |
| disabled | 無効状態 | 50%不透明度、cursor not-allowed |
| loading | 読み込み中 | スピナー表示、クリック不可 |

#### 使用例

\`\`\`tsx
// 基本的な使用法
<Button onClick={() => console.log('clicked')}>Click me</Button>

// バリアント
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

#### アクセシビリティ

- [x] Tabキーでフォーカス可能
- [x] Enter/Spaceキーでアクティブ化可能
- [x] 無効時にaria-disabled="true"
- [x] 読み込み時にaria-busy="true"
- [x] WCAG AAコントラスト比準拠
- [x] 視覚的なフォーカスインジケーター
```

## 記入例: Cardコンポーネント

```markdown
### 4.2 Component API: Card

#### 説明

関連コンテンツをグループ化して表示するためのコンテナコンポーネント。
記事プレビュー、商品カード、ユーザープロフィールなどに使用。

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| children | ReactNode | ✓ | - | カードコンテンツ |
| variant | 'elevated' \| 'outlined' \| 'filled' | - | 'elevated' | カードスタイル |
| padding | 'none' \| 'sm' \| 'md' \| 'lg' | - | 'md' | 内側のパディング |
| clickable | boolean | - | false | クリック可能かどうか |
| onClick | () => void | - | - | クリックイベントハンドラー |
| href | string | - | - | リンクURL（指定時に<a>としてレンダリング） |

#### バリアント

**variant**
- `elevated`: シャドウ付き - デフォルト、浮いているように見える
- `outlined`: ボーダー付き - フラットデザイン、軽い印象
- `filled`: 背景付き - グレー背景、明確な分離

**padding**
- `none`: 0px - カスタムレイアウト用
- `sm`: 12px - コンパクト表示
- `md`: 16px - 標準パディング
- `lg`: 24px - ゆったりパディング

#### 状態

| State | Description | Visual Change |
|-------|-------------|---------------|
| default | 通常状態 | ベーススタイリング |
| hover | ホバー時（clickable=true） | シャドウが強まる |
| focus | フォーカス時 | フォーカスリング |

#### 使用例

\`\`\`tsx
// 基本的な使用法
<Card>
  <h3>カードタイトル</h3>
  <p>カードコンテンツがここに入ります。</p>
</Card>

// バリアント
<Card variant="elevated">Elevated Card</Card>
<Card variant="outlined">Outlined Card</Card>
<Card variant="filled">Filled Card</Card>

// クリック可能
<Card clickable onClick={() => navigate('/detail')}>
  クリックしてナビゲート
</Card>

// リンクとして
<Card href="/product/123">
  商品を見る
</Card>

// パディングなし（カスタムレイアウト）
<Card padding="none">
  <img src="..." className="w-full" />
  <div className="p-4">Content</div>
</Card>
\`\`\`

#### アクセシビリティ

- [x] クリック可能時にrole="button"または<a>タグ
- [x] Tabキーでフォーカス可能（clickable/href時）
- [x] Enter/Spaceキーでアクティブ化可能
- [x] 視覚的なフォーカスインジケーター
```

## テンプレート変数

| 変数 | 説明 | 例 |
| --- | --- | --- |
| `[ComponentName]` | コンポーネント名（PascalCase） | `Button`, `Card` |
| `[Description]` | 1-2文の説明 | "アクションをトリガーするための..." |
| Props table | Markdownテーブル | 上記参照 |
| Variants section | バリアントの説明 | 上記参照 |
| States table | 状態リスト | 上記参照 |
| Usage Examples | TSXコードブロック | 上記参照 |
| Accessibility | チェックリスト | 上記参照 |

## 生成ルール

### Propsテーブル

1. **必須を先に**: 必須Propsを先にリスト
2. **アルファベット順**: 同じRequired レベル内ではアルファベット順
3. **childrenを最初に**: childrenは常に最初
4. **ハンドラーを最後に**: onClick等のハンドラーは最後

### バリアントセクション

1. **バリアントpropごとに1サブセクション**: variant, sizeなど
2. **すべてのオプションをリスト**: すべての選択肢を文書化
3. **デフォルトを含める**: デフォルト値を明示的に表示

### 使用例

1. **基本を最初に**: 最もシンプルな使用例を最初に
2. **段階的に複雑に**: 徐々に複雑な例を追加
3. **すべてのバリアントをカバー**: すべてのバリエーションをカバー
4. **実世界のコンテキスト**: 実用的なコンテキストを表示

## パースヒント

spec.mdからパースするためのヒント:

```typescript
// Component APIセクションを検出
const componentApiRegex = /### \d+\.\d+ Component API: (\w+)/;

// Propsテーブルをパース
const propsTableRegex = /\| Prop \| Type \| Required \| Default \| Description \|[\s\S]*?(?=####|$)/;

// バリアントセクションを検出
const variantsRegex = /#### Variants[\s\S]*?(?=####|$)/;
```
