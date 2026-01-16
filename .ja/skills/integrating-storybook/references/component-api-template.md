# Component APIテンプレート

Spec.md `## 4. UI仕様`セクションテンプレート。

## 構造

| セクション    | 内容                                                 |
| ------------- | ---------------------------------------------------- |
| Description   | 1-2文の目的                                          |
| Props         | テーブル: Prop, Type, Required, Default, Description |
| Variants      | バリアントpropごとのオプション一覧                   |
| States        | テーブル: State, Description, Visual Change          |
| Usage         | TSXコード例                                          |
| Accessibility | チェックリスト                                       |

## Propsテーブル形式

| Prop     | Type                     | Required | Default   | Description        |
| -------- | ------------------------ | -------- | --------- | ------------------ |
| children | ReactNode                | ✓        | -         | コンテンツ         |
| variant  | 'primary' \| 'secondary' | -        | 'primary' | スタイル           |
| size     | 'sm' \| 'md' \| 'lg'     | -        | 'md'      | サイズ             |
| disabled | boolean                  | -        | false     | 無効状態           |
| onClick  | () => void               | -        | -         | クリックハンドラー |

## Statesテーブル形式

| State    | Description          | Visual Change    |
| -------- | -------------------- | ---------------- |
| default  | 通常                 | ベーススタイル   |
| hover    | マウスオーバー       | 背景が明るく     |
| active   | 押下中               | 背景が暗く       |
| focus    | キーボードフォーカス | フォーカスリング |
| disabled | 非インタラクティブ   | 不透明度低下     |

## 順序ルール

| ルール   | 順序                               |
| -------- | ---------------------------------- |
| Props    | 必須を先に、その後アルファベット順 |
| Props    | `children`は常に最初               |
| Props    | イベントハンドラーは最後           |
| Examples | 基本を先に、複雑なものは後         |

## パースヒント

```typescript
const componentApiRegex = /### \d+\.\d+ Component API: (\w+)/;
const propsTableRegex = /\| Prop \| Type \|[\s\S]*?(?=####|$)/;
```
