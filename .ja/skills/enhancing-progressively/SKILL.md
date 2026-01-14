---
name: enhancing-progressively
description: >
  CSSファーストアプローチ - JavaScriptの前にCSSを使用。トリガー: レイアウト, スタイル,
  位置, アニメーション, 表示/非表示, トグル, レスポンシブ, CSS Grid, Flexbox,
  transforms, transitions, CSSのみ, JavaScript不要, シンプル
allowed-tools: [Read, Grep, Glob]
user-invocable: false
---

# プログレッシブエンハンスメント

JavaScriptよりCSSを優先。「最良のコードはコードがないこと」

## 検出項目

| カテゴリ         | 対象                                       |
| ---------------- | ------------------------------------------ |
| レイアウト       | JSベースの位置、サイズ、スペーシング       |
| アニメーション   | JSトランジション、アニメーション用タイマー |
| 表示切替         | JS show/hide、トグル、モーダル制御         |
| レスポンシブ     | JSメディアクエリ処理、リサイズイベント     |
| 状態スタイリング | 視覚変更のためのJSクラス操作               |
| スクロール       | JSスクロール処理、無限スクロール           |
| フォームスタイル | JSバリデーションスタイル、入力整形         |

## 検出パターン

| JSパターン                   | CSS代替                            |
| ---------------------------- | ---------------------------------- |
| `element.style.display`      | CSS `:has()`, `[open]`, `<dialog>` |
| `addEventListener('resize')` | CSS `@media`, `clamp()`, `min()`   |
| `getBoundingClientRect`      | CSS Grid, Flexbox, `gap`           |
| `setInterval` アニメーション | CSS `transition`, `@keyframes`     |
| `classList.toggle`           | CSS `:checked`, `:target`          |
| `scrollTo`, `scrollIntoView` | CSS `scroll-behavior: smooth`      |
| `matchMedia`                 | CSS `@media`, `@container`         |

## 品質基準

| 基準                          | 目標 |
| ----------------------------- | ---- |
| CSSで不十分な場合のみJSを使用 | ✓    |
| CSS代替案が文書化されている   | ✓    |
| パフォーマンス影響を考慮      | ✓    |
| ブラウザサポートを確認        | ✓    |

## 優先順位

| 優先度 | 解決策 | いつ使用するか                     |
| ------ | ------ | ---------------------------------- |
| 1      | HTML   | セマンティック要素、ネイティブ入力 |
| 2      | CSS    | Grid, Flexbox, :has(), transitions |
| 3      | JS     | 本当に必要な場合のみ               |
